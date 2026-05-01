import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_payment_methods ─────────────────────────────────────

registerHandler({
  name: 'list_payment_methods',
  requires: ['payments'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data, error } = await db
      .from('payment_methods')
      .select('*')
      .eq('store_id', context.store_id)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  },
})

// ── upsert_payment_method ────────────────────────────────────

registerHandler({
  name: 'upsert_payment_method',
  requires: ['payments'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['payment_methods:{store_id}'],
  validate: (input) => {
    const { type } = input as { type?: string }
    if (!type || !['transfer', 'mp'].includes(type)) {
      return { valid: false, code: 'INVALID_INPUT', message: 'Tipo inválido (transfer o mp)' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { type, name, config, instructions } = input as {
      type: 'transfer' | 'mp'
      name?: string
      config?: Record<string, unknown>
      instructions?: string | null
    }

    const { data: existing } = await db
      .from('payment_methods')
      .select('id')
      .eq('store_id', context.store_id)
      .eq('type', type)
      .maybeSingle()

    const payload = {
      store_id: context.store_id,
      type,
      name: name ?? (type === 'transfer' ? 'Transferencia bancaria' : 'Mercado Pago'),
      config: config ?? {},
      instructions: instructions ?? null,
    }

    if (existing) {
      const { data, error } = await db
        .from('payment_methods')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    } else {
      const { data, error } = await db
        .from('payment_methods')
        .insert({ ...payload, is_active: false, sort_order: type === 'transfer' ? 0 : 1 })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data
    }
  },
})

// ── toggle_payment_method ────────────────────────────────────

registerHandler({
  name: 'toggle_payment_method',
  requires: ['payments'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['payment_methods:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, is_active } = input as { id: string; is_active: boolean }

    const { data, error } = await db
      .from('payment_methods')
      .update({ is_active })
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Método de pago no encontrado')
    return data
  },
})

// ── delete_payment_method ────────────────────────────────────

registerHandler({
  name: 'delete_payment_method',
  requires: ['payments'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['payment_methods:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { error } = await db
      .from('payment_methods')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { id }
  },
})
