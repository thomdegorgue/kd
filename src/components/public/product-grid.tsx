'use client'

import { ProductCard } from './product-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/lib/types'

interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
  onClickDetail?: (productId: string) => void
  stockModuleActive?: boolean
}

export function ProductGrid({ products, isLoading, onClickDetail, stockModuleActive }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2 bg-background rounded-2xl p-3 border border-border/80">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-background rounded-2xl border border-border/80">
        <p className="text-sm font-medium">No hay productos</p>
        <p className="text-xs text-muted-foreground mt-1">
          Probá otra categoría o ajustá tu búsqueda.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {products.map((product, idx) => (
        <div
          key={product.id}
          className="animate-fade-in"
          style={{
            animationDelay: `${Math.min(idx * 40, 400)}ms`,
            animationFillMode: 'both',
          }}
        >
          <ProductCard
            product={product}
            onClickDetail={onClickDetail}
            stockModuleActive={stockModuleActive}
          />
        </div>
      ))}
    </div>
  )
}
