import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createProductSchema, updateProductSchema, reorderProductsSchema } from '@/lib/validations/product'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_products_public ────────────────────────────────────

registerHandler({
  name: 'list_products_public',
  requires: [],
  permissions: ['system'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input) => {
    const { store_id, category_id, search } = input as {
      store_id: string
      category_id?: string
      search?: string
    }

    let query = db
      .from('products')
      .select('*')
      .eq('store_id', store_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    if (category_id && data) {
      const { data: pcData } = await db
        .from('product_categories')
        .select('product_id')
        .eq('store_id', store_id)
        .eq('category_id', category_id)

      if (!pcData) return []
      const ids = new Set((pcData as { product_id: string }[]).map((pc) => pc.product_id))
      return (data as { id: string }[]).filter((p) => ids.has(p.id))
    }

    return data ?? []
  },
})

// ── list_products (admin) ───────────────────────────────────

registerHandler({
  name: 'list_products',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { page = 1, pageSize = 50, search, is_active } = input as {
      page?: number
      pageSize?: number
      search?: string
      is_active?: boolean
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from('products')
      .select('*', { count: 'exact' })
      .eq('store_id', context.store_id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const items = (data ?? []) as Array<{ id: string }>
    const productIds = items.map((p) => p.id)

    if (productIds.length === 0) {
      return { items: [], total: count ?? 0 }
    }

    // Cargar categorías asignadas a los productos del page actual
    const { data: cats } = await db
      .from('product_categories')
      .select('product_id, category_id')
      .eq('store_id', context.store_id)
      .in('product_id', productIds)

    const categoryMap = new Map<string, string[]>()
    for (const row of (cats ?? []) as Array<{ product_id: string; category_id: string }>) {
      const current = categoryMap.get(row.product_id) ?? []
      current.push(row.category_id)
      categoryMap.set(row.product_id, current)
    }

    const enriched = (items as Array<Record<string, unknown> & { id: string }>).map((p) => ({
      ...p,
      category_ids: categoryMap.get(p.id) ?? [],
    }))

    return { items: enriched, total: count ?? 0 }
  },
})

// ── get_product ─────────────────────────────────────────────

registerHandler({
  name: 'get_product',
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

    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('store_id', context.store_id)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw new Error('Producto no encontrado')

    // Cargar categorías asignadas
    const { data: cats } = await db
      .from('product_categories')
      .select('category_id')
      .eq('product_id', id)
      .eq('store_id', context.store_id)

    const category_ids = (cats as { category_id: string }[] | null)?.map((c) => c.category_id) ?? []

    return { ...data, category_ids }
  },
})

// ── create_product ──────────────────────────────────────────

registerHandler({
  name: 'create_product',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'product_created',
  invalidates: ['products:{store_id}'],
  limits: {
    field: 'max_products',
    countQuery: async (storeId: string) => {
      const { count } = await db
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .is('deleted_at', null)
      return count ?? 0
    },
  },
  validate: (input) => {
    const result = createProductSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { category_ids, ...rest } = createProductSchema.parse(input)
    const { data, error } = await db
      .from('products')
      .insert({ ...rest, store_id: context.store_id })
      .select()
      .single()

    if (error) throw new Error(error.message)

    if (category_ids && category_ids.length > 0) {
      await db.from('product_categories').insert(
        category_ids.map((cid: string) => ({
          product_id: (data as { id: string }).id,
          category_id: cid,
          store_id: context.store_id,
        }))
      )
    }

    return data
  },
})

// ── update_product ──────────────────────────────────────────

registerHandler({
  name: 'update_product',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'product_updated',
  invalidates: ['products:{store_id}'],
  validate: (input) => {
    const result = updateProductSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, category_ids, ...fields } = updateProductSchema.parse(input)

    const { data, error } = await db
      .from('products')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Producto no encontrado')

    if (category_ids !== undefined) {
      await db.from('product_categories').delete().eq('product_id', id).eq('store_id', context.store_id)
      if (category_ids.length > 0) {
        await db.from('product_categories').insert(
          category_ids.map((cid: string) => ({
            product_id: id,
            category_id: cid,
            store_id: context.store_id,
          }))
        )
      }
    }

    return data
  },
})

// ── delete_product (soft delete) ────────────────────────────

registerHandler({
  name: 'delete_product',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: 'product_deleted',
  invalidates: ['products:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { data, error } = await db
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', context.store_id)
      .is('deleted_at', null)
      .select('id')
      .single()

    if (error || !data) throw new Error('Producto no encontrado')
    return { deleted: true }
  },
})

// ── reorder_products ────────────────────────────────────────

registerHandler({
  name: 'reorder_products',
  requires: [],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['products:{store_id}'],
  validate: (input) => {
    const result = reorderProductsSchema.safeParse(input)
    if (!result.success) {
      return { valid: false, code: 'INVALID_INPUT', message: 'ids debe ser un array de UUIDs' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { ids } = reorderProductsSchema.parse(input)

    const updates = ids.map((id, index) =>
      db
        .from('products')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('store_id', context.store_id)
    )

    await Promise.all(updates)
    return { updated: true }
  },
})
