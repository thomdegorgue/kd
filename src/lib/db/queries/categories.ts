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
