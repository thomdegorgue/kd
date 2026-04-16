import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createCategorySchema, updateCategorySchema, reorderCategoriesSchema } from '@/lib/validations/category'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_categories_public ──────────────────────────────────

registerHandler({
  name: 'list_categories_public',
  requires: [],
  permissions: ['system'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input) => {
    const { store_id } = input as { store_id: string }
    const { data, error } = await db
      .from('categories')
      .select('*')
      .eq('store_id', store_id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  },
})

// ── list_categories (admin) ─────────────────────────────────

registerHandler({
  name: 'list_categories',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data, error } = await db
      .from('categories')
      .select('*')
      .eq('store_id', context.store_id)
      .order('sort_order', { ascending: true })

    if (error) throw new Error(error.message)

    // Contar productos por categoría
    const { data: pcData } = await db
      .from('product_categories')
      .select('category_id')
      .eq('store_id', context.store_id)

    const counts: Record<string, number> = {}
    if (pcData) {
      for (const pc of pcData as { category_id: string }[]) {
        counts[pc.category_id] = (counts[pc.category_id] ?? 0) + 1
      }
    }

    return (data ?? []).map((cat: { id: string }) => ({
      ...cat,
      product_count: counts[cat.id] ?? 0,
    }))
  },
})

// ── create_category ─────────────────────────────────────────

registerHandler({
  name: 'create_category',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'category_created',
  invalidates: ['categories:{store_id}'],
  validate: (input) => {
    const result = createCategorySchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createCategorySchema.parse(input)
    const { data, error } = await db
      .from('categories')
      .insert({ ...validated, store_id: context.store_id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_category ─────────────────────────────────────────

registerHandler({
  name: 'update_category',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'category_updated',
  invalidates: ['categories:{store_id}'],
  validate: (input) => {
    const result = updateCategorySchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = updateCategorySchema.parse(input)

    const { data, error } = await db
      .from('categories')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Categoría no encontrada')
    return data
  },
})

// ── delete_category ─────────────────────────────────────────

registerHandler({
  name: 'delete_category',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'category_deleted',
  invalidates: ['categories:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    // Eliminar asignaciones de productos
    await db
      .from('product_categories')
      .delete()
      .eq('category_id', id)
      .eq('store_id', context.store_id)

    // Eliminar categoría
    const { error } = await db
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { deleted: true }
  },
})

// ── reorder_categories ──────────────────────────────────────

registerHandler({
  name: 'reorder_categories',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['categories:{store_id}'],
  validate: (input) => {
    const result = reorderCategoriesSchema.safeParse(input)
    if (!result.success) {
      return { valid: false, code: 'INVALID_INPUT', message: 'ids debe ser un array de UUIDs' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { ids } = reorderCategoriesSchema.parse(input)

    const updates = ids.map((id, index) =>
      db
        .from('categories')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('store_id', context.store_id)
    )

    await Promise.all(updates)
    return { updated: true }
  },
})

// ── assign_product_category ─────────────────────────────────

registerHandler({
  name: 'assign_product_category',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['categories:{store_id}', 'products:{store_id}'],
  validate: (input) => {
    const { product_id, category_id } = input as { product_id?: string; category_id?: string }
    if (!product_id || !category_id) {
      return { valid: false, code: 'INVALID_INPUT', message: 'product_id y category_id son requeridos' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id, category_id } = input as { product_id: string; category_id: string }

    const { error } = await db
      .from('product_categories')
      .upsert(
        { product_id, category_id, store_id: context.store_id },
        { onConflict: 'product_id,category_id' }
      )

    if (error) throw new Error(error.message)
    return { assigned: true }
  },
})

// ── remove_product_category ─────────────────────────────────

registerHandler({
  name: 'remove_product_category',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['categories:{store_id}', 'products:{store_id}'],
  validate: (input) => {
    const { product_id, category_id } = input as { product_id?: string; category_id?: string }
    if (!product_id || !category_id) {
      return { valid: false, code: 'INVALID_INPUT', message: 'product_id y category_id son requeridos' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id, category_id } = input as { product_id: string; category_id: string }

    const { error } = await db
      .from('product_categories')
      .delete()
      .eq('product_id', product_id)
      .eq('category_id', category_id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { removed: true }
  },
})
