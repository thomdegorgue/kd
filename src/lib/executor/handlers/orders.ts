import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createOrderSchema, updateOrderStatusSchema, cancelOrderSchema } from '@/lib/validations/order'
import type { OrderStatus } from '@/lib/types'

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
