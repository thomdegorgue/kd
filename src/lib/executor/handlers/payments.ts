import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createPaymentSchema, updatePaymentStatusSchema } from '@/lib/validations/payment'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_payments ────────────────────────────────────────────

registerHandler({
  name: 'list_payments',
  requires: ['payments'],
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
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (order_id) {
      query = query.eq('order_id', order_id)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return { items: data ?? [], total: count ?? 0 }
  },
})

// ── get_payment ──────────────────────────────────────────────

registerHandler({
  name: 'get_payment',
  requires: ['payments'],
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

    const { data, error } = await db
      .from('payments')
      .select('*')
      .eq('id', id)
      .eq('store_id', context.store_id)
      .single()

    if (error || !data) throw new Error('Pago no encontrado')
    return data
  },
})

// ── create_payment ───────────────────────────────────────────

registerHandler({
  name: 'create_payment',
  requires: ['payments'],
  permissions: ['owner', 'admin'],
  event_type: 'payment_created',
  invalidates: ['payments:{store_id}'],
  validate: (input) => {
    const result = createPaymentSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createPaymentSchema.parse(input)

    const insertData = {
      ...validated,
      store_id: context.store_id,
      status: 'approved',
      date: validated.date ?? new Date().toISOString(),
    }

    const { data, error } = await db
      .from('payments')
      .insert(insertData)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_payment_status ────────────────────────────────────

registerHandler({
  name: 'update_payment_status',
  requires: ['payments'],
  permissions: ['owner', 'admin'],
  event_type: 'payment_updated',
  invalidates: ['payments:{store_id}'],
  validate: (input) => {
    const result = updatePaymentStatusSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, status } = updatePaymentStatusSchema.parse(input)

    const { data, error } = await db
      .from('payments')
      .update({ status })
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Pago no encontrado')
    return data
  },
})
