'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag } from 'lucide-react'
import { ProductGrid } from '@/components/public/product-grid'
import { CategoryFilter } from '@/components/public/category-filter'
import { BannerCarousel } from '@/components/public/banner-carousel'
import { CartDrawer } from '@/components/public/cart-drawer'
import { ProductDetailDrawer } from '@/components/public/product-detail-drawer'
import { CatalogHeader } from '@/components/public/catalog-header'
import { CatalogHero } from '@/components/public/catalog-hero'
import { useStore } from '@/components/public/store-context'
import { useCartStore } from '@/lib/stores/cart-store'
import { loadMoreProducts } from '@/lib/actions/catalog-public'
import type { Banner, Category, Product } from '@/lib/types'

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

interface CatalogViewProps {
  products: Product[]
  initialTotal: number
  categories: Category[]
  categoryCounts: Record<string, number>
  banners: Banner[]
  hasBannersModule: boolean
  hasCategoriesModule: boolean
  hasProductPageModule: boolean
  hasStockModule: boolean
  selectedCategoryId: string | null
  slug: string
}

export function CatalogView({
  products: initialProducts,
  initialTotal,
  categories,
  categoryCounts,
  banners,
  hasBannersModule,
  hasCategoriesModule,
  hasProductPageModule,
  hasStockModule,
  selectedCategoryId,
  slug,
}: CatalogViewProps) {
  const store = useStore()
  const router = useRouter()
  const setStoreId = useCartStore((s) => s.setStoreId)

  const [cartOpen, setCartOpen] = useState(false)
  const [detailProductId, setDetailProductId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [displayedProducts, setDisplayedProducts] = useState(initialProducts)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    setStoreId(store.id)
  }, [store.id, setStoreId])

  const hasMore = displayedProducts.length < totalCount && !searchQuery

  const filteredProducts = displayedProducts.filter((p) => {
    if (!searchQuery) return true
    const q = normalize(searchQuery)
    return (
      normalize(p.name).includes(q) ||
      (p.description ? normalize(p.description).includes(q) : false)
    )
  })

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      if (categoryId) {
        router.replace(`/${slug}?category=${categoryId}`, { scroll: false })
      } else {
        router.replace(`/${slug}`, { scroll: false })
      }
    },
    [router, slug],
  )

  const handleLoadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const result = await loadMoreProducts(store.id, nextPage, {
        categoryId: selectedCategoryId ?? undefined,
      })
      setDisplayedProducts((prev) => [...prev, ...result.products])
      setCurrentPage(nextPage)
      setTotalCount(result.total)
    } finally {
      setLoadingMore(false)
    }
  }, [currentPage, store.id, selectedCategoryId])

  const handleProductDetail = useCallback(
    (productId: string) => {
      if (hasProductPageModule) {
        setDetailProductId(productId)
      }
    },
    [hasProductPageModule],
  )

  const activeCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : null

  return (
    <>
      <CatalogHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCartClick={() => setCartOpen(true)}
      />

      <div className="max-w-3xl mx-auto px-4 space-y-0">
        {/* Hero / Cover */}
        <div className="-mx-4">
          {hasBannersModule && banners.length > 0 ? (
            <div className="px-4 pt-3">
              <BannerCarousel banners={banners} />
            </div>
          ) : (
            <CatalogHero />
          )}
        </div>

        {/* Categorías */}
        {hasCategoriesModule && categories.length > 0 && (
          <div className="py-4">
            <CategoryFilter
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={handleCategorySelect}
              productCounts={categoryCounts}
              totalCount={Object.values(categoryCounts).reduce((s, n) => s + n, 0) || initialTotal}
            />
          </div>
        )}

        {/* Header de categoría activa */}
        {activeCategory && (
          <div className="flex items-center gap-2 mb-3 py-1">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{activeCategory.name}</span>
            <span className="text-xs text-muted-foreground">
              — {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
            </span>
          </div>
        )}

        {/* Productos */}
        <div className="pb-8">
          <ProductGrid
            products={filteredProducts}
            onClickDetail={hasProductPageModule ? handleProductDetail : undefined}
            stockModuleActive={hasStockModule}
          />
        </div>

        {hasMore && (
          <div className="flex justify-center pb-8">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="rounded-full border border-border bg-background px-6 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              {loadingMore ? 'Cargando...' : 'Cargar más productos'}
            </button>
          </div>
        )}
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      {hasProductPageModule && (
        <ProductDetailDrawer
          productId={detailProductId}
          open={!!detailProductId}
          onOpenChange={(o) => !o && setDetailProductId(null)}
          onAdded={() => setCartOpen(true)}
        />
      )}
    </>
  )
}
