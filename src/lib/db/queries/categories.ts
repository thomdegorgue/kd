import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { cached } from '@/lib/cache'
import type { Category } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/**
 * Lista categorías activas de una tienda para el catálogo público.
 * Cacheada 300s en Upstash Redis.
 */
export async function listCategoriesPublic(storeId: string): Promise<Category[]> {
  return cached(`categories:${storeId}`, 300, async () => {
    const { data, error } = await db
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error || !data) return []
    return data as Category[]
  })
}

/**
 * Conteo de productos activos por categoría para una tienda.
 * Cacheado 60s. Devuelve Record<categoryId, count>.
 */
export async function getCategoryProductCountsPublic(
  storeId: string,
): Promise<Record<string, number>> {
  return cached(`category-counts:${storeId}`, 60, async () => {
    const { data: pcs } = await db
      .from('product_categories')
      .select('category_id, product_id')
      .eq('store_id', storeId)
    if (!pcs?.length) return {}

    const productIds = Array.from(
      new Set((pcs as Array<{ product_id: string }>).map((r) => r.product_id)),
    )
    const { data: activeProducts } = await db
      .from('products')
      .select('id')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .in('id', productIds)

    const activeSet = new Set(
      ((activeProducts ?? []) as Array<{ id: string }>).map((p) => p.id),
    )

    const counts: Record<string, number> = {}
    for (const row of pcs as Array<{ category_id: string; product_id: string }>) {
      if (!activeSet.has(row.product_id)) continue
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1
    }
    return counts
  })
}

/**
 * Obtiene una categoría por ID para la ruta de categoría pública.
 */
export async function getCategoryPublic(
  storeId: string,
  categoryId: string,
): Promise<Category | null> {
  const { data, error } = await db
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .eq('store_id', storeId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data as Category
}
