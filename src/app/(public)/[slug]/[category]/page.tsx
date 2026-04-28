import { notFound, redirect } from 'next/navigation'
import { getStoreBySlug } from '@/lib/db/queries/stores'
import { getCategoryPublic } from '@/lib/db/queries/categories'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; category: string }>
}) {
  const { slug, category: categoryId } = await params
  const store = await getStoreBySlug(slug)
  if (!store) return {}
  const cat = await getCategoryPublic(store.id, categoryId)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const pageUrl = `${appUrl}/${slug}?category=${categoryId}`
  const title = cat ? `${cat.name} — ${store.name}` : store.name
  const imageUrl = store.logo_url ?? undefined

  return {
    title,
    openGraph: {
      title,
      url: pageUrl,
      type: 'website',
      images: imageUrl ? [{ url: imageUrl, alt: store.name }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string; category: string }>
}) {
  const { slug, category: categoryId } = await params
  const store = await getStoreBySlug(slug)
  if (!store) notFound()

  const category = await getCategoryPublic(store.id, categoryId)
  if (!category) notFound()

  redirect(`/${slug}?category=${categoryId}`)
}
