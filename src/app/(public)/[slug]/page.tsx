import { getStoreBySlug } from '@/lib/db/queries/stores'
import { listProductsPublic } from '@/lib/db/queries/products'
import { listCategoriesPublic } from '@/lib/db/queries/categories'
import { getBannersPublic } from '@/lib/db/queries/banners'
import { notFound } from 'next/navigation'
import { CatalogView } from './catalog-view'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store) return {}
  return {
    title: store.name,
    description: store.description ?? `Catálogo de ${store.name}`,
  }
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store) notFound()

  const [products, categories, banners] = await Promise.all([
    listProductsPublic(store.id),
    listCategoriesPublic(store.id),
    store.modules.banners ? getBannersPublic(store.id) : Promise.resolve([]),
  ])

  return (
    <CatalogView
      products={products}
      categories={categories}
      banners={banners}
      hasBannersModule={!!store.modules.banners}
      hasProductPageModule={!!store.modules.product_page}
      hasShippingModule={!!store.modules.shipping}
      hasStockModule={!!store.modules.stock}
      slug={slug}
    />
  )
}
