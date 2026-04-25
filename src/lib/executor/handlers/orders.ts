import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createOrderSchema, updateOrderStatusSchema, cancelOrderSchema } from '@/lib/validations/order'
import { createSaleSchema, type SalePaymentMethod } from '@/lib/validations/sale'
import type { OrderStatus } from '@/lib/types'
import { sendEmail } from '@/lib/email/resend'
import { NewSaleEmail } from '@/lib/email/templates/new-sale'
import { formatPriceShort } from '@/lib/utils/currency'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// State machine de pedidos
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

// ── list_orders (admin) ─────────────────────────────────────

registerHandler({
  name: 'list_orders',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { page = 1, pageSize = 50, status, date_from, date_to } = input as {
      page?: number
      pageSize?: number
      status?: string
      date_from?: string
      date_to?: string
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from('orders')
      .select('*, customer:customers(id, name, phone)', { count: 'exact' })
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status) {
      query = query.eq('status', status)
    }
    if (date_from) {
      query = query.gte('created_at', date_from)
    }
    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return { items: data ?? [], total: count ?? 0 }
  },
})

// ── get_order ───────────────────────────────────────────────

registerHandler({
  name: 'get_order',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { data: order, error } = await db
      .from('orders')
      .select('*, customer:customers(id, name, phone, email)')
      .eq('id', id)
      .eq('store_id', context.store_id)
      .single()

    if (error || !order) throw new Error('Pedido no encontrado')

    // Cargar items
    const { data: items } = await db
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: true })

    return { ...order, items: items ?? [] }
  },
})

// ── create_order ────────────────────────────────────────────

registerHandler({
  name: 'create_order',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: 'order_created',
  invalidates: ['orders:{store_id}'],
  limits: {
    field: 'max_orders',
    countQuery: async (storeId: string) => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count } = await db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', monthStart)
      return count ?? 0
    },
  },
  validate: (input) => {
    const result = createOrderSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createOrderSchema.parse(input)

    // 1. Crear o buscar customer
    let customerId: string | null = null
    if (validated.customer) {
      const { data: existing } = await db
        .from('customers')
        .select('id')
        .eq('store_id', context.store_id)
        .eq('name', validated.customer.name)
        .limit(1)
        .single()

      if (existing) {
        customerId = (existing as { id: string }).id
      } else {
        const { data: newCust, error: custError } = await db
          .from('customers')
          .insert({
            store_id: context.store_id,
            name: validated.customer.name,
            phone: validated.customer.phone ?? null,
            email: validated.customer.email ?? null,
          })
          .select('id')
          .single()

        if (custError) throw new Error(custError.message)
        customerId = (newCust as { id: string }).id
      }
    }

    // 2. Crear el pedido
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        store_id: context.store_id,
        customer_id: customerId,
        status: 'pending',
        total: validated.total,
        notes: validated.notes ?? null,
      })
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)
    const orderId = (order as { id: string }).id

    // 3. Crear order_items (snapshots)
    const items = validated.items.map((item) => ({
      store_id: context.store_id,
      order_id: orderId,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_name: item.product_name,
    }))

    const { error: itemsError } = await db
      .from('order_items')
      .insert(items)

    if (itemsError) throw new Error(itemsError.message)

    return { ...order, items }
  },
})

// ── update_order_status ─────────────────────────────────────

registerHandler({
  name: 'update_order_status',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: 'order_status_changed',
  invalidates: ['orders:{store_id}'],
  validate: (input) => {
    const result = updateOrderStatusSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, status: newStatus } = updateOrderStatusSchema.parse(input)

    // Obtener status actual
    const { data: current, error: fetchError } = await db
      .from('orders')
      .select('status')
      .eq('id', id)
      .eq('store_id', context.store_id)
      .single()

    if (fetchError || !current) throw new Error('Pedido no encontrado')

    const currentStatus = (current as { status: OrderStatus }).status
    const allowed = VALID_TRANSITIONS[currentStatus] ?? []

    if (!allowed.includes(newStatus as OrderStatus)) {
      throw new Error(`No se puede cambiar de "${currentStatus}" a "${newStatus}"`)
    }

    const { data, error } = await db
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_order ────────────────────────────────────────────

registerHandler({
  name: 'update_order',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'order_updated',
  invalidates: ['orders:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, notes } = input as { id: string; notes?: string }

    const { data, error } = await db
      .from('orders')
      .update({ notes: notes ?? null })
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── create_sale (POS) ───────────────────────────────────────

const PAYMENT_METHOD_DB_MAP: Record<SalePaymentMethod, 'cash' | 'transfer' | 'card' | 'mp' | 'other'> = {
  cash: 'cash',
  transfer: 'transfer',
  card: 'card',
  mp_link: 'mp',
  savings: 'other',
  other: 'other',
}

const PAYMENT_METHOD_LABEL: Record<SalePaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mp_link: 'Link Mercado Pago',
  savings: 'Cuenta de ahorro',
  other: 'Otro',
}

registerHandler({
  name: 'create_sale',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'sale_created',
  invalidates: [
    'orders:{store_id}',
    'products:{store_id}',
    'dashboard:{store_id}',
    'savings:{store_id}',
  ],
  limits: {
    field: 'max_orders',
    countQuery: async (storeId: string) => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count } = await db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', monthStart)
      return count ?? 0
    },
  },
  validate: (input) => {
    const result = createSaleSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createSaleSchema.parse(input)

    const stockModule = context.modules?.stock === true
    const subtotal = validated.items.reduce(
      (acc, item) => acc + item.price_at_sale * item.quantity,
      0,
    )
    const discount = validated.discount_amount ?? 0
    const total = Math.max(0, subtotal - discount)

    // 1. Validar stock (si módulo activo)
    if (stockModule) {
      const productIds = [...new Set(validated.items.map((i) => i.product_id))]
      const { data: products, error: pErr } = await db
        .from('products')
        .select('id, name, stock')
        .in('id', productIds)
        .eq('store_id', context.store_id)

      if (pErr) throw new Error(pErr.message)

      const stockMap = new Map<string, { name: string; stock: number | null }>(
        (products as { id: string; name: string; stock: number | null }[] ?? []).map((p) => [
          p.id,
          { name: p.name, stock: p.stock },
        ]),
      )

      for (const item of validated.items) {
        const entry = stockMap.get(item.product_id)
        if (!entry) throw new Error(`Producto no encontrado: ${item.name_snapshot}`)
        if (entry.stock !== null && entry.stock < item.quantity) {
          throw Object.assign(new Error(`Sin stock suficiente para "${entry.name}" (disponible: ${entry.stock})`), {
            code: 'LIMIT_EXCEEDED',
          })
        }
      }
    }

    // 2. Validar saldo de cuenta de ahorro (si aplica)
    if (validated.payment_method === 'savings' && validated.savings_account_id) {
      const { data: movs, error: mErr } = await db
        .from('savings_movements')
        .select('type, amount')
        .eq('savings_account_id', validated.savings_account_id)
        .eq('store_id', context.store_id)

      if (mErr) throw new Error(mErr.message)

      let balance = 0
      for (const m of (movs as { type: string; amount: number }[] ?? [])) {
        balance += m.type === 'deposit' ? m.amount : -m.amount
      }

      if (balance < validated.payment_amount) {
        throw Object.assign(new Error(`Saldo insuficiente en cuenta de ahorro (disponible: ${balance})`), {
          code: 'LIMIT_EXCEEDED',
        })
      }
    }

    // 3. Resolver customer
    let customerId: string | null = validated.customer_id ?? null
    if (!customerId && validated.customer_name) {
      const { data: newCust, error: custError } = await db
        .from('customers')
        .insert({
          store_id: context.store_id,
          name: validated.customer_name,
          phone: validated.customer_phone ?? null,
        })
        .select('id')
        .single()

      if (custError) throw new Error(custError.message)
      customerId = (newCust as { id: string }).id
    }

    // 4. Insertar order (source='admin', status='confirmed')
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        store_id: context.store_id,
        customer_id: customerId,
        status: 'confirmed',
        source: 'admin',
        total,
        notes: validated.notes ?? null,
        metadata: {
          payment_method: validated.payment_method,
          discount_amount: discount,
          ...(validated.shipping_method_id ? { shipping_method_id: validated.shipping_method_id } : {}),
        },
      })
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)
    const orderId = (order as { id: string }).id

    // 5. Insertar order_items (snapshot de nombre + precio)
    const itemsPayload = validated.items.map((item) => ({
      store_id: context.store_id,
      order_id: orderId,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
      unit_price: item.price_at_sale,
      product_name: item.name_snapshot,
    }))

    const { error: itemsError } = await db.from('order_items').insert(itemsPayload)
    if (itemsError) throw new Error(itemsError.message)

    // 6. Insertar payment
    if (validated.payment_amount > 0) {
      const { error: payError } = await db.from('payments').insert({
        store_id: context.store_id,
        order_id: orderId,
        amount: validated.payment_amount,
        status: 'approved',
        method: PAYMENT_METHOD_DB_MAP[validated.payment_method],
        notes:
          validated.payment_method === 'mp_link' || validated.payment_method === 'savings'
            ? `Método: ${validated.payment_method}`
            : null,
        paid_at: new Date().toISOString(),
      })
      if (payError) throw new Error(payError.message)
    }

    // 7. Si savings: movimiento de retiro
    if (validated.payment_method === 'savings' && validated.savings_account_id && validated.payment_amount > 0) {
      const { error: sErr } = await db.from('savings_movements').insert({
        store_id: context.store_id,
        savings_account_id: validated.savings_account_id,
        type: 'withdrawal',
        amount: validated.payment_amount,
        description: `Venta #${orderId.slice(0, 8)}`,
      })
      if (sErr) throw new Error(sErr.message)
    }

    // 8. Descontar stock (si módulo activo)
    if (stockModule) {
      // Agrupar cantidades por product_id
      const deductions = new Map<string, number>()
      for (const item of validated.items) {
        deductions.set(item.product_id, (deductions.get(item.product_id) ?? 0) + item.quantity)
      }

      for (const [productId, qty] of deductions.entries()) {
        const { data: prod } = await db
          .from('products')
          .select('stock')
          .eq('id', productId)
          .eq('store_id', context.store_id)
          .single()

        const currentStock = (prod as { stock: number | null } | null)?.stock
        if (currentStock !== null && currentStock !== undefined) {
          const nextStock = Math.max(0, currentStock - qty)
          await db
            .from('products')
            .update({ stock: nextStock })
            .eq('id', productId)
            .eq('store_id', context.store_id)
        }
      }
    }

    // 9. Email al dueño (best-effort)
    try {
      const { data: storeRow } = await db
        .from('stores')
        .select('name')
        .eq('id', context.store_id)
        .single()

      const storeName = (storeRow as { name?: string } | null)?.name ?? 'Tu tienda'

      const { data: ownerRow } = await db
        .from('store_users')
        .select('user_id, users:user_id(email)')
        .eq('store_id', context.store_id)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle()

      const users = (ownerRow as { users?: { email?: string } | { email?: string }[] } | null)?.users
      const ownerEmail = Array.isArray(users) ? (users[0]?.email ?? null) : (users?.email ?? null)

      if (ownerEmail) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
        const adminOrderUrl = `${appUrl.replace(/\/$/, '')}/admin/orders/${orderId}`
        const emailHtml = NewSaleEmail({
          ownerEmail,
          storeName,
          adminOrderUrl,
          orderId,
          totalARS: formatPriceShort(total),
          paymentMethodLabel: PAYMENT_METHOD_LABEL[validated.payment_method],
          customerName: validated.customer_name ?? null,
          customerPhone: validated.customer_phone ?? null,
        })

        await sendEmail(ownerEmail, `Nueva venta en ${storeName} — KitDigital`, emailHtml)
      }
    } catch {
      // no-op
    }

    return {
      ...order,
      items: itemsPayload,
      total,
      subtotal,
      discount_amount: discount,
      payment_method: validated.payment_method,
      payment_amount: validated.payment_amount,
    }
  },
})

// ── cancel_order ────────────────────────────────────────────

registerHandler({
  name: 'cancel_order',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'order_cancelled',
  invalidates: ['orders:{store_id}'],
  validate: (input) => {
    const result = cancelOrderSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, reason } = cancelOrderSchema.parse(input)

    // Verificar que no está en estado terminal
    const { data: current } = await db
      .from('orders')
      .select('status')
      .eq('id', id)
      .eq('store_id', context.store_id)
      .single()

    if (!current) throw new Error('Pedido no encontrado')

    const currentStatus = (current as { status: OrderStatus }).status
    if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
      throw new Error(`No se puede cancelar un pedido en estado "${currentStatus}"`)
    }

    const metadata = reason ? { cancel_reason: reason } : {}

    const { data, error } = await db
      .from('orders')
      .update({ status: 'cancelled', metadata })
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})
