'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ProductGrid } from '@/components/public/product-grid'
import { CategoryFilter } from '@/components/public/category-filter'
import { CartButton } from '@/components/public/cart-button'
import { CartDrawer } from '@/components/public/cart-drawer'
import { SearchBar } from '@/components/public/search-bar'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart-store'
import { loadMoreCategoryProducts } from '@/lib/actions/catalog'
import type { Product, Category } from '@/lib/types'

interface CategoryCatalogViewProps {
  products: Product[]
  total: number
  storeId: string
  categoryId: string
  categories: Category[]
  currentCategoryId: string
  categoryName: string
  hasProductPageModule: boolean
  stockModuleActive: boolean
  slug: string
}

export function CategoryCatalogView({
  products: initialProducts,
  total,
  storeId,
  categoryId,
  categories,
  currentCategoryId,
  categoryName,
  hasProductPageModule,
  stockModuleActive,
  slug,
}: CategoryCatalogViewProps) {
  const setStoreId = useCartStore((s) => s.setStoreId)
  const router = useRouter()
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setStoreId(storeId)
  }, [storeId, setStoreId])

  // Reset when initialProducts changes (navigation)
  useEffect(() => {
    setProducts(initialProducts)
    setPage(1)
  }, [initialProducts])

  function normalize(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  }

  const filteredProducts = searchQuery
    ? products.filter((p) => {
        const q = normalize(searchQuery)
        return (
          normalize(p.name).includes(q) ||
          (p.description ? normalize(p.description).includes(q) : false)
        )
      })
    : products

  const handleLoadMore = () => {
    const nextPage = page + 1
    startTransition(async () => {
      const { products: more } = await loadMoreCategoryProducts(storeId, categoryId, nextPage)
      setProducts((prev) => [...prev, ...more])
      setPage(nextPage)
    })
  }

  const handleCategorySelect = useCallback(
    (catId: string | null) => {
      if (catId) {
        router.push(`/${slug}/${catId}`)
      } else {
        router.push(`/${slug}`)
      }
    },
    [router, slug],
  )

  const handleProductDetail = useCallback(
    (productId: string) => {
      if (hasProductPageModule) {
        router.push(`/${slug}/p/${productId}`)
      }
    },
    [router, slug, hasProductPageModule],
  )

  const hasMore = products.length < total && !searchQuery

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <h2 className="text-lg font-semibold">{categoryName}</h2>

      <SearchBar onSearch={setSearchQuery} />

      <CategoryFilter
        categories={categories}
        selectedId={currentCategoryId}
        onSelect={handleCategorySelect}
      />

      <ProductGrid
        products={filteredProducts}
        onClickDetail={hasProductPageModule ? handleProductDetail : undefined}
        stockModuleActive={stockModuleActive}
      />

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending ? 'Cargando...' : `Cargar más (${total - products.length} restantes)`}
          </Button>
        </div>
      )}

      <CartButton onClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  )
}
