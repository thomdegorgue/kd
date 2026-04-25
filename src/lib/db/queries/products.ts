import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { cached } from '@/lib/cache'
import type { Product } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

export const PUBLIC_PAGE_SIZE = 48

export type ProductsPage = { products: Product[]; total: number }

export type PublicProductVariantAttribute = {
  id: string
  name: string
}

export type PublicProductVariant = {
  id: string
  price: number | null
  is_active: boolean
  sort_order: number
  values: Record<string, string> // attribute_id -> value
}

export type PublicProductDetail = Product & {
  variant_attributes?: PublicProductVariantAttribute[]
  variants?: PublicProductVariant[]
}

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

/**
 * Obtiene un producto individual activo para la página de detalle pública,
 * y opcionalmente adjunta variantes si están habilitadas.
 */
export async function getProductPublicDetail(
  storeId: string,
  productId: string,
  options?: { includeVariants?: boolean },
): Promise<PublicProductDetail | null> {
  const product = await getProductPublic(storeId, productId)
  if (!product) return null

  if (!options?.includeVariants) return product as PublicProductDetail

  const [{ data: attrs }, { data: variants }] = await Promise.all([
    db
      .from('variant_attributes')
      .select('id,name')
      .eq('store_id', storeId)
      .eq('product_id', productId),
    db
      .from('variants')
      .select('id,price,is_active,sort_order')
      .eq('store_id', storeId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const variantList = (variants ?? []) as Array<{
    id: string
    price: number | null
    is_active: boolean
    sort_order: number
  }>

  if (!variantList.length) return product as PublicProductDetail

  const variantIds = variantList.map((v) => v.id)
  const { data: values } = await db
    .from('variant_values')
    .select('variant_id,attribute_id,value')
    .eq('store_id', storeId)
    .in('variant_id', variantIds)

  const byVariantId = new Map<string, Record<string, string>>()
  for (const v of variantList) byVariantId.set(v.id, {})

  const vv = (values ?? []) as Array<{ variant_id: string; attribute_id: string; value: string }>
  for (const row of vv) {
    const map = byVariantId.get(row.variant_id)
    if (!map) continue
    map[row.attribute_id] = row.value
  }

  const detail: PublicProductDetail = {
    ...(product as PublicProductDetail),
    variant_attributes: ((attrs ?? []) as Array<{ id: string; name: string }>).map((a) => ({
      id: a.id,
      name: a.name,
    })),
    variants: variantList.map((v) => ({
      id: v.id,
      price: v.price,
      is_active: v.is_active,
      sort_order: v.sort_order,
      values: byVariantId.get(v.id) ?? {},
    })),
  }

  // Si no hay atributos o variantes, no mandamos campos (evita UI vacía).
  if (!detail.variant_attributes?.length || !detail.variants?.length) {
    delete detail.variant_attributes
    delete detail.variants
  }

  return detail
}
