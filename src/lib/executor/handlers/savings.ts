import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import {
  createSavingsAccountSchema,
  updateSavingsAccountSchema,
  createSavingsMovementSchema,
} from '@/lib/validations/savings'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_savings_accounts ────────────────────────────────────

registerHandler({
  name: 'list_savings_accounts',
  requires: ['savings_account'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data: accounts, error } = await db
      .from('savings_accounts')
      .select('*')
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    if (!accounts || accounts.length === 0) return []

    const accountIds = (accounts as { id: string }[]).map((a) => a.id)

    const { data: movements, error: mErr } = await db
      .from('savings_movements')
      .select('savings_account_id, type, amount')
      .in('savings_account_id', accountIds)
      .eq('store_id', context.store_id)

    if (mErr) throw new Error(mErr.message)

    const balanceMap = new Map<string, number>()
    for (const m of (movements as { savings_account_id: string; type: string; amount: number }[] ?? [])) {
      const current = balanceMap.get(m.savings_account_id) ?? 0
      balanceMap.set(m.savings_account_id, m.type === 'deposit' ? current + m.amount : current - m.amount)
    }

    const customerIds = (accounts as { customer_id: string | null }[])
      .map((a) => a.customer_id)
      .filter(Boolean) as string[]

    const customerNameMap = new Map<string, string>()
    if (customerIds.length > 0) {
      const { data: customers } = await db
        .from('customers')
        .select('id, name')
        .in('id', customerIds)
      for (const c of (customers as { id: string; name: string | null }[] ?? [])) {
        if (c.name) customerNameMap.set(c.id, c.name)
      }
    }

    return (accounts as { id: string; customer_id: string | null }[]).map((a) => ({
      ...a,
      balance: balanceMap.get(a.id) ?? 0,
      customer_name: a.customer_id ? (customerNameMap.get(a.customer_id) ?? null) : null,
    }))
  },
})

// ── create_savings_account ───────────────────────────────────

registerHandler({
  name: 'create_savings_account',
  requires: ['savings_account'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['savings:{store_id}'],
  validate: (input) => {
    const result = createSavingsAccountSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createSavingsAccountSchema.parse(input)

    const { data, error } = await db
      .from('savings_accounts')
      .insert({ ...validated, store_id: context.store_id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_savings_account ───────────────────────────────────

registerHandler({
  name: 'update_savings_account',
  requires: ['savings_account'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['savings:{store_id}'],
  validate: (input) => {
    const result = updateSavingsAccountSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = updateSavingsAccountSchema.parse(input)

    const { data, error } = await db
      .from('savings_accounts')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Cuenta no encontrada')
    return data
  },
})

// ── list_savings_movements ───────────────────────────────────

registerHandler({
  name: 'list_savings_movements',
  requires: ['savings_account'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: (input) => {
    const { account_id } = input as { account_id?: string }
    if (!account_id) return { valid: false, code: 'INVALID_INPUT', message: 'account_id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { account_id } = input as { account_id: string }

    const { data, error } = await db
      .from('savings_movements')
      .select('*')
      .eq('savings_account_id', account_id)
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  },
})

// ── create_savings_movement ──────────────────────────────────

registerHandler({
  name: 'create_savings_movement',
  requires: ['savings_account'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['savings:{store_id}'],
  validate: (input) => {
    const result = createSavingsMovementSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createSavingsMovementSchema.parse(input)

    // Validate balance doesn't go negative on withdrawal
    if (validated.type === 'withdrawal') {
      const { data: movements } = await db
        .from('savings_movements')
        .select('type, amount')
        .eq('savings_account_id', validated.account_id)
        .eq('store_id', context.store_id)

      let balance = 0
      for (const m of (movements as { type: string; amount: number }[] ?? [])) {
        balance += m.type === 'deposit' ? m.amount : -m.amount
      }

      if (balance < validated.amount) {
        throw new Error('Saldo insuficiente para realizar el retiro')
      }
    }

    const { data, error } = await db
      .from('savings_movements')
      .insert({
        savings_account_id: validated.account_id,
        store_id: context.store_id,
        type: validated.type,
        amount: validated.amount,
        description: validated.description ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})
