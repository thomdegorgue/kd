import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { cached } from '@/lib/cache'
import type { Product } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/**
 * Lista productos activos de una tienda para el catálogo público.
 * Cacheada 60s en Upstash Redis (cambios frecuentes).
 */
export async function listProductsPublic(
  storeId: string,
  options?: { categoryId?: string; search?: string },
): Promise<Product[]> {
  // Sin filtros de búsqueda o categoría: usar caché
  if (!options?.search && !options?.categoryId) {
    return cached(`products:${storeId}`, 60, async () => {
      const { data, error } = await db
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error || !data) return []
      return data as Product[]
    })
  }

  // Con filtros: no cachear (búsquedas y filtros por categoría son dinámicos)
  let query = db
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  const { data, error } = await query

  if (error || !data) return []

  if (options?.categoryId) {
    const { data: pcData } = await db
      .from('product_categories')
      .select('product_id')
      .eq('store_id', storeId)
      .eq('category_id', options.categoryId)

    if (!pcData) return []
    const productIds = new Set((pcData as { product_id: string }[]).map((pc) => pc.product_id))
    return (data as Product[]).filter((p) => productIds.has(p.id))
  }

  return data as Product[]
}

/**
 * Obtiene un producto individual activo para la página de detalle pública.
 */
export async function getProductPublic(
  storeId: string,
  productId: string,
): Promise<Product | null> {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('store_id', storeId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null
  return data as Product
}
