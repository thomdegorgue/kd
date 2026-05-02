import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createExpenseSchema, updateExpenseSchema, DEFAULT_EXPENSE_CATEGORIES } from '@/lib/validations/expense'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_expenses ────────────────────────────────────────────

registerHandler({
  name: 'list_expenses',
  requires: ['expenses'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { category, date_from, date_to, page = 1, pageSize = 50 } = input as {
      category?: string
      date_from?: string
      date_to?: string
      page?: number
      pageSize?: number
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('store_id', context.store_id)
      .order('date', { ascending: false })
      .range(from, to)

    if (category) query = query.eq('category', category)
    if (date_from) query = query.gte('date', date_from)
    if (date_to) query = query.lte('date', date_to)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return { items: data ?? [], total: count ?? 0 }
  },
})

// ── get_expenses_summary ─────────────────────────────────────

registerHandler({
  name: 'get_expenses_summary',
  requires: ['expenses'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { date_from, date_to } = input as { date_from?: string; date_to?: string }

    let query = db
      .from('expenses')
      .select('category, amount')
      .eq('store_id', context.store_id)

    if (date_from) query = query.gte('date', date_from)
    if (date_to) query = query.lte('date', date_to)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const byCategory: Record<string, number> = {}
    let total = 0

    for (const e of (data as { category: string; amount: number }[] ?? [])) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
      total += e.amount
    }

    return { total, by_category: byCategory }
  },
})

// ── create_expense ───────────────────────────────────────────

registerHandler({
  name: 'create_expense',
  requires: ['expenses'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['expenses:{store_id}'],
  validate: (input) => {
    const result = createExpenseSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createExpenseSchema.parse(input)

    const { data, error } = await db
      .from('expenses')
      .insert({ ...validated, store_id: context.store_id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_expense ───────────────────────────────────────────

registerHandler({
  name: 'update_expense',
  requires: ['expenses'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['expenses:{store_id}'],
  validate: (input) => {
    const result = updateExpenseSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = updateExpenseSchema.parse(input)

    const { data, error } = await db
      .from('expenses')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Gasto no encontrado')
    return data
  },
})

// ── delete_expense ───────────────────────────────────────────

registerHandler({
  name: 'delete_expense',
  requires: ['expenses'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['expenses:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { error } = await db
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { deleted: true }
  },
})

// ── get_expense_categories ──────────────────────────────────

registerHandler({
  name: 'get_expense_categories',
  requires: ['expenses'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { data, error } = await db
      .from('stores')
      .select('config')
      .eq('id', context.store_id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Tienda no encontrada')

    const config = data.config ?? {}
    let categories = config.expense_categories as string[] | undefined

    // Inicializar con categorías por defecto si no existen
    if (!categories || !Array.isArray(categories)) {
      categories = Array.from(DEFAULT_EXPENSE_CATEGORIES)
    }

    return { expense_categories: categories }
  },
})

// ── update_expense_categories ────────────────────────────────

registerHandler({
  name: 'update_expense_categories',
  requires: ['expenses'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['expense_categories:{store_id}'],
  validate: (input) => {
    const { categories } = input as { categories?: unknown }
    if (!Array.isArray(categories)) {
      return { valid: false, code: 'INVALID_INPUT', message: 'categories debe ser un array' }
    }
    if (!categories.every((c) => typeof c === 'string' && c.length > 0)) {
      return { valid: false, code: 'INVALID_INPUT', message: 'Todas las categorías deben ser strings no vacíos' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { categories } = input as { categories: string[] }
    const deduped = Array.from(new Set(categories))

    const { data, error } = await db
      .from('stores')
      .select('config')
      .eq('id', context.store_id)
      .single()

    if (error) throw new Error(error.message)

    const config = data?.config ?? {}
    const updated = await db
      .from('stores')
      .update({ config: { ...config, expense_categories: deduped } })
      .eq('id', context.store_id)
      .select()
      .single()

    if (updated.error) throw new Error(updated.error.message)
    return { expense_categories: deduped }
  },
})
