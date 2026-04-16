import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createFinanceEntrySchema, updateFinanceEntrySchema } from '@/lib/validations/finance'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_finance_entries ─────────────────────────────────────

registerHandler({
  name: 'list_finance_entries',
  requires: ['finance'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { type, date_from, date_to, page = 1, pageSize = 50 } = input as {
      type?: 'income' | 'expense'
      date_from?: string
      date_to?: string
      page?: number
      pageSize?: number
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from('finance_entries')
      .select('*', { count: 'exact' })
      .eq('store_id', context.store_id)
      .order('date', { ascending: false })
      .range(from, to)

    if (type) query = query.eq('type', type)
    if (date_from) query = query.gte('date', date_from)
    if (date_to) query = query.lte('date', date_to)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return { items: data ?? [], total: count ?? 0 }
  },
})

// ── get_finance_summary ──────────────────────────────────────

registerHandler({
  name: 'get_finance_summary',
  requires: ['finance'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { date_from, date_to } = input as { date_from?: string; date_to?: string }

    let query = db
      .from('finance_entries')
      .select('type, amount')
      .eq('store_id', context.store_id)

    if (date_from) query = query.gte('date', date_from)
    if (date_to) query = query.lte('date', date_to)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    let total_income = 0
    let total_expense = 0

    for (const entry of (data as { type: string; amount: number }[] ?? [])) {
      if (entry.type === 'income') total_income += entry.amount
      else total_expense += entry.amount
    }

    return {
      total_income,
      total_expense,
      net: total_income - total_expense,
    }
  },
})

// ── create_finance_entry ─────────────────────────────────────

registerHandler({
  name: 'create_finance_entry',
  requires: ['finance'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['finance_entries:{store_id}'],
  validate: (input) => {
    const result = createFinanceEntrySchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createFinanceEntrySchema.parse(input)

    const { data, error } = await db
      .from('finance_entries')
      .insert({ ...validated, store_id: context.store_id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_finance_entry ─────────────────────────────────────

registerHandler({
  name: 'update_finance_entry',
  requires: ['finance'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['finance_entries:{store_id}'],
  validate: (input) => {
    const result = updateFinanceEntrySchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = updateFinanceEntrySchema.parse(input)

    const { data, error } = await db
      .from('finance_entries')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Entrada no encontrada')
    return data
  },
})

// ── delete_finance_entry ─────────────────────────────────────

registerHandler({
  name: 'delete_finance_entry',
  requires: ['finance'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['finance_entries:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { error } = await db
      .from('finance_entries')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { deleted: true }
  },
})
