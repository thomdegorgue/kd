'use client'

import Image from 'next/image'
import { Minus, Package, Plus, Star } from 'lucide-react'
import { useStore } from '@/components/public/store-context'
import { useCartStore } from '@/lib/stores/cart-store'
import { formatPriceShort } from '@/lib/utils/currency'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
  onClickDetail?: (productId: string) => void
  stockModuleActive?: boolean
}

export function ProductCard({ product, onClickDetail, stockModuleActive }: ProductCardProps) {
  const store = useStore()
  const brand = store.config?.primary_color ?? '#0f0f0f'
  const brandSoft = store.config?.secondary_color ?? '#f5f5f5'

  const items = useCartStore((s) => s.items)
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stock = (product as any).stock as number | null | undefined
  const noStock = !!stockModuleActive && stock === 0
  const lowStock =
    !!stockModuleActive && typeof stock === 'number' && stock > 0 && stock <= 5

  const comparePrice = product.compare_price ?? null
  const hasCompare = !!comparePrice && comparePrice > product.price
  const discountPct = hasCompare
    ? Math.round(((comparePrice - product.price) / comparePrice) * 100)
    : null

  // Cantidad sólo para variant-less en cart (sin variantLabel)
  const cartQty = items
    .filter((i) => i.productId === product.id && !i.variantLabel)
    .reduce((sum, i) => sum + i.quantity, 0)

  const handleOpen = () => onClickDetail?.(product.id)

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (noStock) return
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
    })
  }

  const handleDec = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateQuantity(product.id, cartQty - 1)
  }

  return (
    <div className="group bg-background rounded-2xl overflow-hidden border border-border/80 shadow-xs hover:border-foreground/25 hover:shadow-md transition-all duration-200">
      {/* Imagen */}
      <div
        className="relative aspect-square cursor-pointer overflow-hidden"
        style={{ background: brandSoft }}
        onClick={handleOpen}
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform duration-300 group-hover:scale-[1.05] ${
              noStock ? 'opacity-50' : ''
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package
              className="h-16 w-16 transition-transform duration-200 group-hover:scale-105"
              style={{ color: brand, opacity: 0.18 }}
            />
          </div>
        )}

        {/* Hover overlay "Ver detalle" */}
        {onClickDetail && !noStock && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center pointer-events-none">
            <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/35 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Ver detalle →
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_featured && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-950 inline-flex items-center gap-0.5 leading-none">
              <Star className="h-2.5 w-2.5" />
              Destacado
            </span>
          )}
          {hasCompare && discountPct !== null && discountPct > 0 && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-white leading-none"
              style={{ background: brand }}
            >
              -{discountPct}%
            </span>
          )}
          {noStock && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground leading-none">
              Sin stock
            </span>
          )}
          {lowStock && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border bg-background text-foreground leading-none">
              Quedan {stock}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <p
            className="text-xs font-medium leading-tight line-clamp-2 cursor-pointer hover:underline"
            onClick={handleOpen}
          >
            {product.name}
          </p>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold" style={{ color: brand }}>
            {formatPriceShort(product.price)}
          </span>
          {hasCompare && (
            <span className="text-[10px] text-muted-foreground line-through">
              {formatPriceShort(comparePrice!)}
            </span>
          )}
        </div>

        {noStock ? (
          <button
            type="button"
            disabled
            className="w-full h-9 rounded-xl text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed"
          >
            Sin stock
          </button>
        ) : cartQty === 0 ? (
          <button
            type="button"
            onClick={handleAdd}
            className="w-full h-9 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: brand }}
          >
            Agregar
          </button>
        ) : (
          <div
            className="flex items-stretch h-9 rounded-xl overflow-hidden border-2 bg-background"
            style={{ borderColor: brand }}
          >
            <button
              type="button"
              onClick={handleDec}
              className="w-9 flex items-center justify-center shrink-0 transition-colors hover:bg-muted/40"
              aria-label="Restar"
            >
              <Minus className="h-3 w-3" style={{ color: brand }} />
            </button>
            <span
              className="flex-1 flex items-center justify-center text-xs font-bold"
              style={{ color: brand }}
            >
              {cartQty}
            </span>
            <button
              type="button"
              onClick={handleAdd}
              className="w-9 flex items-center justify-center shrink-0 text-white transition-opacity hover:opacity-90"
              style={{ background: brand }}
              aria-label="Sumar"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
