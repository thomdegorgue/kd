'use server'

import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { checkoutLimiter } from '@/lib/ratelimit'
import { createOrderCheckoutPreference } from '@/lib/payments/mercadopago'

const db = supabaseServiceRole

export type CheckoutItemInput = {
  product_id: string
  variant_id?: string | null
  quantity: number
}

export type CheckoutOrderInput = {
  store_slug: string
  items: CheckoutItemInput[]
  customer: {
    name: string
    phone: string
    email?: string | null
  }
  delivery: {
    type: 'pickup' | 'delivery'
    address?: string | null
  }
  payment_method_id: string
  client_ip?: string | null
}

export type TransferInfo = {
  cbu: string
  alias: string | null
  holder: string
  bank: string | null
  instructions: string | null
}

export type CheckoutOrderResult =
  | { ok: true; method: 'transfer'; order_id: string; transfer_info: TransferInfo }
  | { ok: true; method: 'mp'; order_id: string; mp_init_point: string }
  | { ok: false; message: string }

export type PublicPaymentMethod = {
  id: string
  type: 'transfer' | 'mp'
  name: string
}

export type CheckoutSuccessData = {
  order_id: string
  total: number
  store_name: string
  method: 'transfer' | 'mp'
  transfer_info: TransferInfo | null
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

export async function createCheckoutOrder(input: CheckoutOrderInput): Promise<CheckoutOrderResult> {
  // Rate limit (best-effort). Si Redis no está, es no-op.
  const ip = input.client_ip?.trim() || 'unknown'
  const rl = await checkoutLimiter.limit(`ip:${ip}:store:${input.store_slug}`)
  if (!rl.success) {
    return { ok: false, message: 'Demasiados intentos. Probá de nuevo en un minuto.' }
  }

  // 1) Resolver store por slug y validar checkout habilitado
  const { data: store, error: storeErr } = await db
    .from('stores')
    .select('id, slug, status, modules')
    .eq('slug', input.store_slug)
    .single()

  if (storeErr || !store?.id) return { ok: false, message: 'Tienda no encontrada' }

  const modules = (store.modules as Record<string, boolean>) ?? {}
  if (modules.checkout !== true) {
    return { ok: false, message: 'El checkout online no está activo para esta tienda' }
  }

  // 2) Validar método de pago activo para la tienda
  const { data: methodRow, error: methodErr } = await db
    .from('payment_methods')
    .select('*')
    .eq('id', input.payment_method_id)
    .eq('store_id', store.id)
    .eq('is_active', true)
    .single()

  if (methodErr || !methodRow) return { ok: false, message: 'Método de pago inválido' }

  // 3) Validar inputs básicos
  const customerName = input.customer.name.trim()
  const customerPhone = normalizePhone(input.customer.phone)
  if (!customerName) return { ok: false, message: 'Nombre es requerido' }
  if (customerPhone.length < 6) return { ok: false, message: 'Teléfono inválido' }
  if (!Array.isArray(input.items) || input.items.length === 0) return { ok: false, message: 'Carrito vacío' }

  // 4) Recalcular total server-side (anti-tampering)
  // Nota: no confiamos en unit_price del cliente; lo tomamos de products/variants.
  const productIds = Array.from(new Set(input.items.map((i) => i.product_id)))
  const { data: products, error: productsErr } = await db
    .from('products')
    .select('id, price, name, is_active, deleted_at')
    .eq('store_id', store.id)
    .in('id', productIds)

  if (productsErr) return { ok: false, message: 'No se pudo validar el carrito' }
  const productById = new Map<string, { price: number; name: string; is_active: boolean; deleted_at: string | null }>()
  for (const p of products ?? []) {
    productById.set(p.id, {
      price: p.price,
      name: p.name,
      is_active: p.is_active,
      deleted_at: p.deleted_at,
    })
  }

  let total = 0
  const orderItems: {
    product_id: string
    variant_id: string | null
    quantity: number
    unit_price: number
    product_name: string
  }[] = []
  for (const item of input.items) {
    const qty = Math.max(0, Math.floor(item.quantity))
    if (qty <= 0) return { ok: false, message: 'Cantidad inválida' }

    const p = productById.get(item.product_id)
    if (!p || !p.is_active || p.deleted_at) return { ok: false, message: 'Hay productos no disponibles' }

    const unitPrice = Number(p.price ?? 0)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return { ok: false, message: 'Precio inválido' }

    total += unitPrice * qty
    orderItems.push({
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      quantity: qty,
      unit_price: unitPrice,
      product_name: p.name,
    })
  }

  // 5) Crear/encontrar customer por phone
  const { data: existingCustomer } = await db
    .from('customers')
    .select('id')
    .eq('store_id', store.id)
    .eq('phone', customerPhone)
    .limit(1)
    .maybeSingle()

  let customerId: string | null = existingCustomer?.id ?? null
  if (!customerId) {
    const { data: newCust, error: newCustErr } = await db
      .from('customers')
      .insert({
        store_id: store.id,
        name: customerName,
        phone: customerPhone,
        email: input.customer.email?.trim() || null,
      })
      .select('id')
      .single()

    if (newCustErr || !newCust?.id) return { ok: false, message: 'No se pudo crear el cliente' }
    customerId = newCust.id
  }

  // 6) Crear order
  const metadata = {
    payment_method_id: input.payment_method_id,
    delivery_type: input.delivery.type,
    address: input.delivery.type === 'delivery' ? (input.delivery.address?.trim() || null) : null,
    email: input.customer.email?.trim() || null,
  }

  const { data: order, error: orderErr } = await db
    .from('orders')
    .insert({
      store_id: store.id,
      customer_id: customerId,
      status: 'pending',
      source: 'checkout',
      total,
      metadata,
    })
    .select('id')
    .single()

  if (orderErr || !order?.id) return { ok: false, message: 'No se pudo crear el pedido' }

  const orderId = order.id as string

  // 7) Crear order_items (snapshots)
  const { error: itemsErr } = await db
    .from('order_items')
    .insert(orderItems.map((it) => ({ ...it, store_id: store.id, order_id: orderId })))

  if (itemsErr) return { ok: false, message: 'No se pudo guardar el pedido' }

  // 8) Crear payment (pedido)
  const paymentMethodType = (methodRow.type as 'transfer' | 'mp')
  const { data: paymentRow, error: payErr } = await db
    .from('payments')
    .insert({
      store_id: store.id,
      order_id: orderId,
      amount: total,
      status: 'pending',
      method: paymentMethodType === 'mp' ? 'mp' : 'transfer',
      notes: null,
    })
    .select('id')
    .single()

  if (payErr || !paymentRow?.id) return { ok: false, message: 'No se pudo crear el pago' }

  // 9) Resultado según método
  if (paymentMethodType === 'transfer') {
    const transferConfig = (methodRow.config as Record<string, string | null>) ?? {}
    return {
      ok: true,
      method: 'transfer',
      order_id: orderId,
      transfer_info: {
        cbu: transferConfig.cbu ?? '',
        alias: transferConfig.alias ?? null,
        holder: transferConfig.holder ?? '',
        bank: transferConfig.bank ?? null,
        instructions: (methodRow.instructions as string | null) ?? null,
      },
    }
  }

  // Mercado Pago por tienda: create preference con notification_url apuntando a endpoint de orders.
  const config = (methodRow.config as Record<string, unknown>) ?? {}
  const accessToken = String(config.access_token ?? '')
  if (!accessToken) return { ok: false, message: 'Mercado Pago no está configurado' }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  if (!appUrl) return { ok: false, message: 'APP_URL no configurado' }

  const notificationUrl = `${appUrl}/api/webhooks/mercadopago/orders?store=${store.id}`

  const mp = await createOrderCheckoutPreference(accessToken, {
    title: `Pedido ${store.slug}`,
    amountPesos: Math.round(total / 100),
    payer_email: input.customer.email?.trim() || undefined,
    external_reference: `order:${orderId}`,
    notification_url: notificationUrl,
    back_url: {
      success: `${appUrl}/${store.slug}/checkout/success?order=${orderId}&method=mp`,
      failure: `${appUrl}/${store.slug}/checkout/success?order=${orderId}&method=mp`,
      pending: `${appUrl}/${store.slug}/checkout/success?order=${orderId}&method=mp`,
    },
  })

  // Nota: mp_payment_id se setea en webhook cuando llega el pago.
  return { ok: true, method: 'mp', order_id: orderId, mp_init_point: mp.init_point }
}

export async function getPublicPaymentMethods(slug: string): Promise<PublicPaymentMethod[]> {
  const { data: store } = await db
    .from('stores')
    .select('id, modules')
    .eq('slug', slug)
    .single()

  if (!store) return []
  const modules = (store.modules as Record<string, boolean>) ?? {}
  if (!modules.checkout) return []

  const { data } = await db
    .from('payment_methods')
    .select('id, type, name')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return (data ?? []) as PublicPaymentMethod[]
}

export async function getCheckoutSuccessData(
  order_id: string,
  method: string,
): Promise<CheckoutSuccessData | null> {
  const { data: order } = await db
    .from('orders')
    .select('id, total, store_id, metadata')
    .eq('id', order_id)
    .single()

  if (!order) return null

  const { data: store } = await db
    .from('stores')
    .select('name')
    .eq('id', order.store_id)
    .single()

  let transferInfo: TransferInfo | null = null
  if (method === 'transfer') {
    const metadata = (order.metadata as Record<string, unknown>) ?? {}
    const pmId = metadata.payment_method_id as string | undefined
    if (pmId) {
      const { data: pm } = await db
        .from('payment_methods')
        .select('config, instructions')
        .eq('id', pmId)
        .eq('store_id', order.store_id)
        .single()

      if (pm) {
        const cfg = (pm.config as Record<string, string | null>) ?? {}
        transferInfo = {
          cbu: cfg.cbu ?? '',
          alias: cfg.alias ?? null,
          holder: cfg.holder ?? '',
          bank: cfg.bank ?? null,
          instructions: (pm.instructions as string | null) ?? null,
        }
      }
    }
  }

  return {
    order_id,
    total: order.total as number,
    store_name: (store?.name as string) ?? '',
    method: method === 'transfer' ? 'transfer' : 'mp',
    transfer_info: transferInfo,
  }
}

