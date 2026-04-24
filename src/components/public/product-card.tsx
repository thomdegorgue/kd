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
}

export function ProductCard({ product, onClickDetail }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
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
            className="object-cover transition-transform group-hover:scale-105"
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
      </div>

      <CardContent className="p-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2">{product.name}</h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{formatPriceShort(product.price)}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
