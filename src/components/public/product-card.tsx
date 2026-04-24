'use client'

import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatPriceShort } from '@/lib/utils/currency'
import { useCartStore } from '@/lib/stores/cart-store'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
  onClickDetail?: (productId: string) => void
  stockModuleActive?: boolean
}

export function ProductCard({ product, onClickDetail, stockModuleActive }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stock = (product as any).stock
  const hasNoStock = stockModuleActive && stock !== null && stock === 0
  const hasLowStock = stockModuleActive && stock !== null && stock > 0 && stock <= 5

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasNoStock) return
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
    })
  }

  return (
    <Card
      className="group overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClickDetail?.(product.id)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform group-hover:scale-105 ${hasNoStock ? 'opacity-50' : ''}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
            Sin imagen
          </div>
        )}
        {product.is_featured && (
          <span className="absolute top-2 left-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-amber-900 leading-none">
            Destacado
          </span>
        )}
        {hasNoStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs font-semibold">
            Sin stock
          </span>
        )}
        {hasLowStock && (
          <span className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-0.5 text-[10px] font-semibold rounded">
            Quedan {stock}
          </span>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">{product.name}</h3>
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{formatPriceShort(product.price)}</span>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(product as any).compare_price && (product as any).compare_price > product.price && (
                <>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPriceShort((product as any).compare_price)}
                  </span>
                  <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                    -{Math.round((((product as any).compare_price - product.price) / (product as any).compare_price) * 100)}%
                  </span>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAdd}
              disabled={hasNoStock}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
