'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductGrid } from '@/components/public/product-grid'
import { CategoryFilter } from '@/components/public/category-filter'
import { BannerCarousel } from '@/components/public/banner-carousel'
import { TrustBadges } from '@/components/public/trust-badges'
import { CartButton } from '@/components/public/cart-button'
import { CartDrawer } from '@/components/public/cart-drawer'
import { SearchBar } from '@/components/public/search-bar'
import { useStore } from '@/components/public/store-context'
import { useCartStore } from '@/lib/stores/cart-store'
import type { Product, Category, Banner } from '@/lib/types'
import { useEffect } from 'react'

interface CatalogViewProps {
  products: Product[]
  categories: Category[]
  banners: Banner[]
  hasBannersModule: boolean
  hasProductPageModule: boolean
  hasShippingModule: boolean
  hasStockModule: boolean
  slug: string
}

export function CatalogView({
  products: initialProducts,
  categories,
  banners,
  hasBannersModule,
  hasProductPageModule,
  hasShippingModule,
  hasStockModule,
  slug,
}: CatalogViewProps) {
  const store = useStore()
  const router = useRouter()
  const setStoreId = useCartStore((s) => s.setStoreId)
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Vincular carrito con esta tienda
  useEffect(() => {
    setStoreId(store.id)
  }, [store.id, setStoreId])

  // Filtrar productos client-side (los datos vienen SSR)
  const filteredProducts = initialProducts.filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  // Para filtro por categoría, necesitamos product_categories (no disponible en SSR sin join)
  // Por ahora: si hay categoría seleccionada, recargamos con server action en futuro
  // Simplificación: filtro por categoría navega a /{slug}/{category}
  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      if (categoryId) {
        router.push(`/${slug}/${categoryId}`)
      } else {
        setSelectedCategory(null)
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

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      {/* Banners */}
      {hasBannersModule && banners.length > 0 && (
        <BannerCarousel banners={banners} />
      )}

      {/* Trust Badges */}
      {hasShippingModule && (
        <TrustBadges />
      )}

      {/* Search */}
      <SearchBar onSearch={setSearchQuery} />

      {/* Categories */}
      <CategoryFilter
        categories={categories}
        selectedId={selectedCategory}
        onSelect={handleCategorySelect}
      />

      {/* Products */}
      <ProductGrid
        products={filteredProducts}
        onClickDetail={hasProductPageModule ? handleProductDetail : undefined}
        stockModuleActive={hasStockModule}
      />

      {/* Cart FAB + Drawer */}
      <CartButton onClick={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        storeName={store.name}
        storeWhatsapp={store.whatsapp ?? ''}
      />
    </div>
  )
}
