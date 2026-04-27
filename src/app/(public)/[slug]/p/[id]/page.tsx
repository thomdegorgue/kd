import { notFound, redirect } from 'next/navigation'
import { getStoreBySlug } from '@/lib/db/queries/stores'
import { getProductPublicDetail } from '@/lib/db/queries/products'
import { ProductDetailView } from './product-detail-view'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const store = await getStoreBySlug(slug)
  if (!store) return {}
  const product = await getProductPublicDetail(store.id, id)
  if (!product) return { title: store.name }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const pageUrl = `${appUrl}/${slug}/p/${id}`
  const imageUrl = product.image_url ?? store.logo_url ?? undefined

  return {
    title: `${product.name} — ${store.name}`,
    description: product.description ?? undefined,
    openGraph: {
      title: `${product.name} — ${store.name}`,
      description: product.description ?? undefined,
      url: pageUrl,
      type: 'website',
      images: imageUrl ? [{ url: imageUrl, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — ${store.name}`,
      description: product.description ?? undefined,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const store = await getStoreBySlug(slug)
  if (!store) notFound()

  // Si el módulo product_page no está activo, redirect al catálogo
  if (!store.modules.product_page) {
    redirect(`/${slug}`)
  }

  const product = await getProductPublicDetail(store.id, id, {
    includeVariants: !!store.modules.variants,
  })
  if (!product) notFound()

  return <ProductDetailView product={product} slug={slug} />
}
