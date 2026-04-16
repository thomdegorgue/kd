import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { updateStoreSchema, updateStoreConfigSchema } from '@/lib/validations/store'
import { enableModuleSchema, disableModuleSchema, CORE_MODULES } from '@/lib/validations/module'
import { PRO_MODULES } from '@/lib/billing/calculator'
import type { ModuleName } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── get_store (admin) ──────────────────────────────────────

registerHandler({
  name: 'get_store',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data, error } = await db
      .from('stores')
      .select('*')
      .eq('id', context.store_id)
      .single()

    if (error || !data) throw new Error('Tienda no encontrada')
    return data
  },
})

// ── get_store_public ────────────────────────────────────────

registerHandler({
  name: 'get_store_public',
  requires: [],
  permissions: ['system'],
  event_type: null,
  invalidates: [],
  validate: (input) => {
    const parsed = input as { slug?: string }
    if (!parsed.slug || typeof parsed.slug !== 'string') {
      return { valid: false, code: 'INVALID_INPUT', message: 'slug es requerido' }
    }
    return { valid: true }
  },
  execute: async (input) => {
    const { slug } = input as { slug: string }
    const { data, error } = await db
      .from('stores')
      .select('id, name, slug, logo_url, cover_url, whatsapp, description, status, config, modules')
      .eq('slug', slug)
      .in('status', ['demo', 'active', 'past_due'])
      .single()

    if (error || !data) {
      throw new Error('Tienda no encontrada')
    }
    return data
  },
})

// ── update_store_config ─────────────────────────────────────

registerHandler({
  name: 'update_store_config',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'store_updated',
  invalidates: ['store:{store_id}'],
  validate: (input) => {
    const result = updateStoreConfigSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = updateStoreConfigSchema.parse(input)

    // Merge con config existente
    const { data: current } = await db
      .from('stores')
      .select('config')
      .eq('id', context.store_id)
      .single()

    const existingConfig = (current as { config: Record<string, unknown> } | null)?.config ?? {}
    const mergedConfig = { ...existingConfig, ...validated }

    const { data, error } = await db
      .from('stores')
      .update({ config: mergedConfig })
      .eq('id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_store ────────────────────────────────────────────

registerHandler({
  name: 'update_store',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'store_updated',
  invalidates: ['store:{store_id}'],
  validate: (input) => {
    const result = updateStoreSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = updateStoreSchema.parse(input)
    const { data, error } = await db
      .from('stores')
      .update(validated)
      .eq('id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── enable_module ──────────────────────────────────────────

registerHandler({
  name: 'enable_module',
  requires: [],
  permissions: ['owner'],
  event_type: 'module_enabled',
  invalidates: ['store:{store_id}'],
  validate: (input) => {
    const result = enableModuleSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { module } = enableModuleSchema.parse(input)

    // Módulos pro requieren suscripción activa
    if (PRO_MODULES.includes(module as typeof PRO_MODULES[number])) {
      const { data: storeData } = await db
        .from('stores')
        .select('billing_status')
        .eq('id', context.store_id)
        .single()
      if ((storeData as { billing_status: string } | null)?.billing_status !== 'active') {
        throw new Error('Se requiere suscripción activa para activar módulos pro. Ir a /admin/billing')
      }
    }

    const { data: store } = await db
      .from('stores')
      .select('modules')
      .eq('id', context.store_id)
      .single()

    const modules = ((store as { modules: Record<string, boolean> } | null)?.modules ?? {}) as Record<string, boolean>
    modules[module] = true

    const { data, error } = await db
      .from('stores')
      .update({ modules })
      .eq('id', context.store_id)
      .select('modules')
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── disable_module ─────────────────────────────────────────

registerHandler({
  name: 'disable_module',
  requires: [],
  permissions: ['owner'],
  event_type: 'module_disabled',
  invalidates: ['store:{store_id}'],
  validate: (input) => {
    const result = disableModuleSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message }
    }
    const { module } = result.data
    if (CORE_MODULES.includes(module as ModuleName)) {
      return { valid: false, code: 'CONFLICT', message: 'No se puede desactivar un módulo core' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { module } = disableModuleSchema.parse(input)

    const { data: store } = await db
      .from('stores')
      .select('modules')
      .eq('id', context.store_id)
      .single()

    const modules = ((store as { modules: Record<string, boolean> } | null)?.modules ?? {}) as Record<string, boolean>
    modules[module] = false

    const { data, error } = await db
      .from('stores')
      .update({ modules })
      .eq('id', context.store_id)
      .select('modules')
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})
