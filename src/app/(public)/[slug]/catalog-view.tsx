'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductGrid } from '@/components/public/product-grid'
import { CategoryFilter } from '@/components/public/category-filter'
import { BannerCarousel } from '@/components/public/banner-carousel'
import { TrustBadges } from '@/components/public/trust-badges'
import { CartButton } from '@/components/public/cart-button'
import { CartDrawer } from '@/components/public/cart-drawer'
import { SearchBar } from '@/components/public/search-bar'
import { StoreHeader } from '@/components/public/store-header'
import { useStore } from '@/components/public/store-context'
import { useCartStore } from '@/lib/stores/cart-store'
import { loadMoreProducts } from '@/lib/actions/catalog-public'
import type { Product, Category, Banner } from '@/lib/types'

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

interface CatalogViewProps {
  products: Product[]
  initialTotal: number
  categories: Category[]
  banners: Banner[]
  hasBannersModule: boolean
  hasProductPageModule: boolean
  hasShippingModule: boolean
  hasStockModule: boolean
  selectedCategoryId: string | null
  slug: string
}

export function CatalogView({
  products: initialProducts,
  initialTotal,
  categories,
  banners,
  hasBannersModule,
  hasProductPageModule,
  hasShippingModule,
  hasStockModule,
  selectedCategoryId,
  slug,
}: CatalogViewProps) {
  const store = useStore()
  const router = useRouter()
  const setStoreId = useCartStore((s) => s.setStoreId)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [displayedProducts, setDisplayedProducts] = useState(initialProducts)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    setStoreId(store.id)
  }, [store.id, setStoreId])

  // hasMore: hay más en el servidor Y no hay búsqueda activa (búsqueda es client-side)
  const hasMore = displayedProducts.length < totalCount && !searchQuery

  // Filtro client-side: solo por búsqueda (categoría se filtra server-side via URL)
  const filteredProducts = displayedProducts.filter((p) => {
    if (!searchQuery) return true
    const q = normalize(searchQuery)
    return (
      normalize(p.name).includes(q) ||
      (p.description ? normalize(p.description).includes(q) : false)
    )
  })

  // Cambio de categoría: actualiza URL sin full reload
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
        router.push(`/${slug}/p/${productId}`)
      }
    },
    [router, slug, hasProductPageModule],
  )

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Header premium */}
      <StoreHeader
        name={store.name}
        description={store.description}
        coverUrl={store.cover_url}
        city={store.config?.city ?? null}
        hours={store.config?.hours ?? null}
      />

      {/* Banners */}
      {hasBannersModule && banners.length > 0 && (
        <BannerCarousel banners={banners} />
      )}

      {/* Trust Badges */}
      {hasShippingModule && <TrustBadges />}

      {/* Search */}
      <SearchBar onSearch={setSearchQuery} />

      {/* Categories */}
      <CategoryFilter
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={handleCategorySelect}
      />

      {/* Products */}
      <ProductGrid
        products={filteredProducts}
        onClickDetail={hasProductPageModule ? handleProductDetail : undefined}
        stockModuleActive={hasStockModule}
      />

      {/* Cargar más */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-md border px-6 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
          >
            {loadingMore ? 'Cargando...' : 'Cargar más productos'}
          </button>
        </div>
      )}

      {/* Cart FAB + Drawer */}
      <CartButton onClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  )
}
