import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_customers ──────────────────────────────────────────

registerHandler({
  name: 'list_customers',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { page = 1, pageSize = 50, search } = input as {
      page?: number
      pageSize?: number
      search?: string
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from('customers')
      .select('*, savings_accounts(id, name)', { count: 'exact' })
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return { items: data ?? [], total: count ?? 0 }
  },
})

// ── get_customer ────────────────────────────────────────────

registerHandler({
  name: 'get_customer',
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

    const { data: customer, error } = await db
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('store_id', context.store_id)
      .single()

    if (error || !customer) throw new Error('Cliente no encontrado')

    const { data: orders } = await db
      .from('orders')
      .select('id, status, total, created_at')
      .eq('store_id', context.store_id)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: savingsAccount } = await db
      .from('savings_accounts')
      .select('id, name')
      .eq('store_id', context.store_id)
      .eq('customer_id', id)
      .limit(1)
      .maybeSingle()

    return { ...customer, orders: orders ?? [], savings_account: savingsAccount ?? null }
  },
})

// ── update_customer ─────────────────────────────────────────

registerHandler({
  name: 'update_customer',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['customers:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = input as { id: string; notes?: string | null }

    const { data, error } = await db
      .from('customers')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Cliente no encontrado')
    return data
  },
})
