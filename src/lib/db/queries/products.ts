import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { cached } from '@/lib/cache'
import type { Product } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

export const PUBLIC_PAGE_SIZE = 48

export type ProductsPage = { products: Product[]; total: number }

/**
 * Lista productos activos de una tienda para el catálogo público.
 * Página 1 sin filtros: cacheada 60s en Upstash Redis.
 * Productos destacados primero, luego por sort_order y fecha.
 */
export async function listProductsPublic(
  storeId: string,
  options?: { categoryId?: string; search?: string; page?: number; pageSize?: number },
): Promise<ProductsPage> {
  const page = options?.page ?? 1
  const pageSize = options?.pageSize ?? PUBLIC_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const baseOrder = (q: ReturnType<typeof db.from>) =>
    q
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

  // Página 1 sin filtros: usar caché
  if (!options?.search && !options?.categoryId && page === 1) {
    return cached(`products:${storeId}`, 60, async () => {
      const { data, error, count } = await baseOrder(
        db
          .from('products')
          .select('*', { count: 'exact' })
          .eq('store_id', storeId)
          .eq('is_active', true)
          .is('deleted_at', null),
      )
        .range(from, to)

      if (error || !data) return { products: [], total: 0 }
      return { products: data as Product[], total: count ?? 0 }
    })
  }

  // Con filtros o páginas adicionales: no cachear
  let query = db
    .from('products')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  if (options?.categoryId) {
    const { data: pcData } = await db
      .from('product_categories')
      .select('product_id')
      .eq('store_id', storeId)
      .eq('category_id', options.categoryId)

    if (!pcData?.length) return { products: [], total: 0 }
    const productIds = (pcData as { product_id: string }[]).map((pc) => pc.product_id)
    query = query.in('id', productIds)
  }

  const { data, error, count } = await baseOrder(query).range(from, to)

  if (error || !data) return { products: [], total: 0 }
  return { products: data as Product[], total: count ?? 0 }
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
