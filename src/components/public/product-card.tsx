'use client'

import Image from 'next/image'
import { Plus, Star } from 'lucide-react'
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
  const comparePrice = product.compare_price ?? null
  const hasCompare = !!comparePrice && comparePrice > product.price
  const discountPct = hasCompare
    ? Math.round(((comparePrice - product.price) / comparePrice) * 100)
    : null

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
      className="group overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
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
            className={`object-cover transition-transform duration-300 group-hover:scale-[1.06] ${hasNoStock ? 'opacity-50' : ''}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
            Sin imagen
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          {product.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-amber-900 leading-none">
              <Star className="h-3 w-3" />
              Destacado
            </span>
          )}
          {hasCompare && discountPct !== null && discountPct > 0 && (
            <span className="inline-flex w-fit rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-semibold leading-none">
              -{discountPct}%
            </span>
          )}
        </div>
        {hasNoStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white text-xs font-semibold">
            Sin stock
          </span>
        )}
        {hasLowStock && (
          <span className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-0.5 text-[10px] font-semibold rounded-full">
            Quedan {stock}
          </span>
        )}

        {/* Quick add */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-2 right-2 h-9 w-9 rounded-full shadow-sm ring-1 ring-foreground/10 bg-background/90 hover:bg-background"
          onClick={handleAdd}
          disabled={hasNoStock}
          aria-label="Agregar al carrito"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">{product.name}</h3>
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{formatPriceShort(product.price)}</span>
              {hasCompare && (
                <>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPriceShort(comparePrice!)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
