import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createBannerSchema, updateBannerSchema, reorderBannersSchema } from '@/lib/validations/banner'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_banners ────────────────────────────────────────────

registerHandler({
  name: 'list_banners',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data, error } = await db
      .from('banners')
      .select('*')
      .eq('store_id', context.store_id)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  },
})

// ── create_banner ───────────────────────────────────────────

registerHandler({
  name: 'create_banner',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'banner_created',
  invalidates: ['banners:{store_id}'],
  validate: (input) => {
    const result = createBannerSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createBannerSchema.parse(input)

    const { data: maxData } = await db
      .from('banners')
      .select('sort_order')
      .eq('store_id', context.store_id)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxSort = (maxData?.[0]?.sort_order ?? -1) as number
    const nextSort = maxSort + 1

    const { data, error } = await db
      .from('banners')
      .insert({
        ...validated,
        store_id: context.store_id,
        sort_order: nextSort,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_banner ───────────────────────────────────────────

registerHandler({
  name: 'update_banner',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'banner_updated',
  invalidates: ['banners:{store_id}'],
  validate: (input) => {
    const result = updateBannerSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = updateBannerSchema.parse(input)

    const { data, error } = await db
      .from('banners')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Banner no encontrado')
    return data
  },
})

// ── delete_banner ───────────────────────────────────────────

registerHandler({
  name: 'delete_banner',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'banner_deleted',
  invalidates: ['banners:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { error } = await db
      .from('banners')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { deleted: true }
  },
})

// ── reorder_banners ─────────────────────────────────────────

registerHandler({
  name: 'reorder_banners',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['banners:{store_id}'],
  validate: (input) => {
    const result = reorderBannersSchema.safeParse(input)
    if (!result.success) {
      return { valid: false, code: 'INVALID_INPUT', message: 'ids debe ser un array de UUIDs' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { ids } = reorderBannersSchema.parse(input)

    const updates = ids.map((id, index) =>
      db
        .from('banners')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('store_id', context.store_id)
    )

    await Promise.all(updates)
    return { updated: true }
  },
})
