import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/db/queries/stores'
import { listProductsPublic } from '@/lib/db/queries/products'
import { getCategoryProductCountsPublic, listCategoriesPublic } from '@/lib/db/queries/categories'
import { getBannersPublic } from '@/lib/db/queries/banners'
import { CatalogView } from '../../[slug]/catalog-view'
import { DemoOverlay } from './_components/demo-overlay'

export default async function DemoStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams
  const categoryId = typeof sp.category === 'string' ? sp.category : undefined

  const store = await getStoreBySlug(slug)
  if (!store || store.status !== 'demo') notFound()

  const [{ products, total }, categories, categoryCounts, banners] = await Promise.all([
    listProductsPublic(store.id, { categoryId, page: 1 }),
    store.modules.categories ? listCategoriesPublic(store.id) : Promise.resolve([]),
    store.modules.categories
      ? getCategoryProductCountsPublic(store.id)
      : Promise.resolve({} as Record<string, number>),
    store.modules.banners ? getBannersPublic(store.id) : Promise.resolve([]),
  ])

  return (
    <>
      <CatalogView
        key={categoryId ?? 'all'}
        products={products}
        initialTotal={total}
        categories={categories}
        categoryCounts={categoryCounts}
        banners={banners}
        hasBannersModule={!!store.modules.banners}
        hasCategoriesModule={!!store.modules.categories}
        hasProductPageModule={!!store.modules.product_page}
        hasStockModule={!!store.modules.stock}
        selectedCategoryId={categoryId ?? null}
        slug={slug}
      />
      <DemoOverlay slug={slug} />
    </>
  )
}
