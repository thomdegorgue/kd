import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import {
  createShippingMethodSchema,
  updateShippingMethodSchema,
  createShipmentSchema,
  updateShipmentStatusSchema,
} from '@/lib/validations/shipping'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'KD-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ── list_shipping_methods ────────────────────────────────────

registerHandler({
  name: 'list_shipping_methods',
  requires: ['shipping'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data, error } = await db
      .from('shipping_methods')
      .select('*')
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  },
})

// ── create_shipping_method ───────────────────────────────────

registerHandler({
  name: 'create_shipping_method',
  requires: ['shipping'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['shipping_methods:{store_id}'],
  validate: (input) => {
    const result = createShippingMethodSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createShippingMethodSchema.parse(input)

    const { data, error } = await db
      .from('shipping_methods')
      .insert({ ...validated, store_id: context.store_id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_shipping_method ───────────────────────────────────

registerHandler({
  name: 'update_shipping_method',
  requires: ['shipping'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['shipping_methods:{store_id}'],
  validate: (input) => {
    const result = updateShippingMethodSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = updateShippingMethodSchema.parse(input)

    const { data, error } = await db
      .from('shipping_methods')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Método de envío no encontrado')
    return data
  },
})

// ── delete_shipping_method ───────────────────────────────────

registerHandler({
  name: 'delete_shipping_method',
  requires: ['shipping'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['shipping_methods:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { error } = await db
      .from('shipping_methods')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { deleted: true }
  },
})

// ── list_shipments ───────────────────────────────────────────

registerHandler({
  name: 'list_shipments',
  requires: ['shipping'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { order_id, page = 1, pageSize = 50 } = input as {
      order_id?: string
      page?: number
      pageSize?: number
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from('shipments')
      .select('*', { count: 'exact' })
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (order_id) query = query.eq('order_id', order_id)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return { items: data ?? [], total: count ?? 0 }
  },
})

// ── create_shipment ──────────────────────────────────────────

registerHandler({
  name: 'create_shipment',
  requires: ['shipping'],
  permissions: ['owner', 'admin'],
  event_type: 'shipment_created',
  invalidates: ['shipments:{store_id}'],
  validate: (input) => {
    const result = createShipmentSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createShipmentSchema.parse(input)

    let tracking_code: string
    let unique = false
    let attempts = 0
    do {
      tracking_code = generateTrackingCode()
      const { data: existing } = await db
        .from('shipments')
        .select('id')
        .eq('tracking_code', tracking_code)
        .single()
      unique = !existing
      attempts++
    } while (!unique && attempts < 10)

    const { data, error } = await db
      .from('shipments')
      .insert({
        ...validated,
        store_id: context.store_id,
        tracking_code,
        status: 'preparing',
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_shipment_status ───────────────────────────────────

registerHandler({
  name: 'update_shipment_status',
  requires: ['shipping'],
  permissions: ['owner', 'admin'],
  event_type: 'shipment_updated',
  invalidates: ['shipments:{store_id}'],
  validate: (input) => {
    const result = updateShipmentStatusSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, status, notes } = updateShipmentStatusSchema.parse(input)

    const updateData: Record<string, unknown> = { status }
    if (notes !== undefined) updateData.notes = notes
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString()

    const { data, error } = await db
      .from('shipments')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Envío no encontrado')
    return data
  },
})
