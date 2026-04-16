'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductGrid } from '@/components/public/product-grid'
import { CategoryFilter } from '@/components/public/category-filter'
import { CartButton } from '@/components/public/cart-button'
import { CartDrawer } from '@/components/public/cart-drawer'
import { SearchBar } from '@/components/public/search-bar'
import { useStore } from '@/components/public/store-context'
import type { Product, Category } from '@/lib/types'

interface CategoryCatalogViewProps {
  products: Product[]
  categories: Category[]
  currentCategoryId: string
  categoryName: string
  hasProductPageModule: boolean
  slug: string
}

export function CategoryCatalogView({
  products: initialProducts,
  categories,
  currentCategoryId,
  categoryName,
  hasProductPageModule,
  slug,
}: CategoryCatalogViewProps) {
  const store = useStore()
  const router = useRouter()
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProducts = initialProducts.filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      if (categoryId) {
        router.push(`/${slug}/${categoryId}`)
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
      />

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
