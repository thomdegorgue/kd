import type { MetadataRoute } from 'next'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

const STORES_PER_CHUNK = 200

async function countActiveStores(): Promise<number> {
  const { count } = await db
    .from('stores')
    .select('*', { count: 'exact', head: true })
    .eq('billing_status', 'active')
    .eq('status', 'active')
  return count ?? 0
}

export async function generateSitemaps() {
  const total = await countActiveStores()
  const chunks = Math.max(1, Math.ceil(total / STORES_PER_CHUNK))
  const ids = [{ id: '0' }]
  for (let i = 0; i < chunks; i++) {
    ids.push({ id: String(i + 1) })
  }
  return ids
}

export default async function sitemap({
  id,
}: {
  id: string
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitdigital.ar'

  if (id === '0') {
    return [
      { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
      { url: `${baseUrl}/auth/login`, changeFrequency: 'never', priority: 0.5 },
      { url: `${baseUrl}/auth/signup`, changeFrequency: 'never', priority: 0.8 },
      { url: `${baseUrl}/terminos`, changeFrequency: 'monthly', priority: 0.3 },
      { url: `${baseUrl}/privacidad`, changeFrequency: 'monthly', priority: 0.3 },
    ]
  }

  const chunkIndex = Math.max(0, Number(id) - 1)
  const from = chunkIndex * STORES_PER_CHUNK
  const to = from + STORES_PER_CHUNK - 1

  const { data: storesData } = await db
    .from('stores')
    .select('id, slug, updated_at, modules')
    .eq('billing_status', 'active')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(from, to)

  const stores = (storesData ?? []) as Array<{
    id: string
    slug: string
    updated_at: string | null
    modules: Record<string, boolean> | null
  }>

  if (!stores.length) return []

  const storeIds = stores.map((s) => s.id)
  const slugByStoreId = new Map(stores.map((s) => [s.id, s.slug]))

  const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
    db
      .from('products')
      .select('id, store_id, updated_at')
      .in('store_id', storeIds)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(5000),
    db
      .from('categories')
      .select('id, store_id, updated_at')
      .in('store_id', storeIds)
      .eq('is_active', true)
      .limit(2000),
  ])

  const products = (productsData ?? []) as Array<{
    id: string
    store_id: string
    updated_at: string | null
  }>

  const categories = (categoriesData ?? []) as Array<{
    id: string
    store_id: string
    updated_at: string | null
  }>

  const entries: MetadataRoute.Sitemap = []

  // Store catalog root pages
  for (const store of stores) {
    entries.push({
      url: `${baseUrl}/${store.slug}`,
      lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    })
  }

  // Category pages
  for (const cat of categories) {
    const slug = slugByStoreId.get(cat.store_id)
    if (!slug) continue
    entries.push({
      url: `${baseUrl}/${slug}/${cat.id}`,
      lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  // Product detail pages (only for stores with product_page module)
  const storeWithProductPage = new Set(
    stores
      .filter((s) => s.modules?.product_page === true)
      .map((s) => s.id),
  )

  for (const product of products) {
    if (!storeWithProductPage.has(product.store_id)) continue
    const slug = slugByStoreId.get(product.store_id)
    if (!slug) continue
    entries.push({
      url: `${baseUrl}/${slug}/p/${product.id}`,
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  return entries
}
