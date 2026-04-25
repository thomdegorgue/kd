import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/db/queries/stores'
import { listProductsPublic } from '@/lib/db/queries/products'
import { listCategoriesPublic, getCategoryPublic } from '@/lib/db/queries/categories'
import { CategoryCatalogView } from './category-catalog-view'

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
  return {
    title: cat ? `${cat.name} — ${store.name}` : store.name,
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

  const [{ products }, categories] = await Promise.all([
    listProductsPublic(store.id, { categoryId }),
    listCategoriesPublic(store.id),
  ])

  return (
    <CategoryCatalogView
      products={products}
      categories={categories}
      currentCategoryId={categoryId}
      categoryName={category.name}
      hasProductPageModule={!!store.modules.product_page}
      slug={slug}
    />
  )
}
