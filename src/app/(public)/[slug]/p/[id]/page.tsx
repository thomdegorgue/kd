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
  return {
    title: product ? `${product.name} — ${store.name}` : store.name,
    description: product?.description ?? undefined,
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
