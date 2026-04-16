'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { WhatsAppCheckoutButton } from '@/components/shared/whatsapp-checkout-button'
import { useCartStore, useCartTotal } from '@/lib/stores/cart-store'
import { formatPriceShort } from '@/lib/utils/currency'

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeName: string
  storeWhatsapp: string
}

export function CartDrawer({ open, onOpenChange, storeName, storeWhatsapp }: CartDrawerProps) {
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartTotal()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Tu pedido</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantLabel ?? ''}`} className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">—</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-sm font-medium leading-tight line-clamp-1">{item.name}</p>
                      {item.variantLabel && (
                        <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      {/* Qty controls */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantLabel)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantLabel)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-medium">
                        {formatPriceShort(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.productId, item.variantLabel)}
                    className="self-start p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Footer */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold">{formatPriceShort(total)}</span>
              </div>

              <WhatsAppCheckoutButton
                items={items.map((i) => ({
                  name: i.name,
                  quantity: i.quantity,
                  unit_price: i.price,
                  variant_label: i.variantLabel,
                }))}
                storeName={storeName}
                storeWhatsapp={storeWhatsapp}
                className="w-full"
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="w-full text-muted-foreground"
              >
                Vaciar carrito
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
