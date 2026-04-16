'use client'

import { ProductCard } from './product-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/lib/types'

interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
  onClickDetail?: (productId: string) => void
}

export function ProductGrid({ products, isLoading, onClickDetail }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">No hay productos disponibles</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClickDetail={onClickDetail}
        />
      ))}
    </div>
  )
}
