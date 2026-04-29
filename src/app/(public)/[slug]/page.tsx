import { getStoreBySlug } from '@/lib/db/queries/stores'
import { listProductsPublic } from '@/lib/db/queries/products'
import { getCategoryProductCountsPublic, listCategoriesPublic } from '@/lib/db/queries/categories'
import { getBannersPublic } from '@/lib/db/queries/banners'
import { notFound } from 'next/navigation'
import { CatalogView } from './catalog-view'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const store = await getStoreBySlug(slug)
  if (!store) return {}
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'
  const isDev = process.env.NODE_ENV === 'development'
  const storeUrl = isDev ? `${appUrl.replace(/\/$/, '')}/${slug}` : `https://${slug}.${domain}`
  const fallbackOgImage = `${appUrl.replace(/\/$/, '')}/og-image.jpg`
  const ogImageUrl = store.cover_url || store.logo_url || fallbackOgImage
  return {
    title: store.name,
    description: store.description || `Tienda de ${store.name}`,
    openGraph: {
      title: store.name,
      description: store.description || `Tienda de ${store.name}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
      type: 'website',
      siteName: 'KitDigital',
      url: storeUrl,
    },
    twitter: {
      card: 'summary_large_image',
    },
  }
}

export default async function StorePage({
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
  if (!store) notFound()

  const [{ products, total }, categories, categoryCounts, banners] = await Promise.all([
    listProductsPublic(store.id, { categoryId, page: 1 }),
    store.modules.categories ? listCategoriesPublic(store.id) : Promise.resolve([]),
    store.modules.categories
      ? getCategoryProductCountsPublic(store.id)
      : Promise.resolve({} as Record<string, number>),
    store.modules.banners ? getBannersPublic(store.id) : Promise.resolve([]),
  ])

  return (
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
  )
}
