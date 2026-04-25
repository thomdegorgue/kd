'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, Trash2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useCartStore, useCartTotal } from '@/lib/stores/cart-store'
import { useStore } from '@/components/public/store-context'
import { formatPriceShort } from '@/lib/utils/currency'
import { buildWhatsAppMessage } from '@/lib/utils/whatsapp'

type CheckoutForm = {
  name: string
  deliveryType: 'pickup' | 'shipping'
  address: string
  note: string
}

const INITIAL_FORM: CheckoutForm = {
  name: '',
  deliveryType: 'pickup',
  address: '',
  note: '',
}

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const store = useStore()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartTotal()

  const [step, setStep] = useState<'cart' | 'checkout'>('cart')
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM)

  const hasShipping = !!store.modules.shipping

  const resetAndClose = (open: boolean) => {
    if (!open) {
      setStep('cart')
      setForm(INITIAL_FORM)
    }
    onOpenChange(open)
  }

  const handleSend = () => {
    const { whatsappUrl } = buildWhatsAppMessage({
      items: items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        variant_label: i.variantLabel,
      })),
      storeConfig: { name: store.name, whatsapp: store.whatsapp ?? '' },
      customerName: form.name || undefined,
      deliveryType: hasShipping ? form.deliveryType : undefined,
      address: hasShipping && form.deliveryType === 'shipping' ? form.address || undefined : undefined,
      customerNotes: form.note || undefined,
    })
    window.open(whatsappUrl, '_blank')
    clearCart()
    setStep('cart')
    setForm(INITIAL_FORM)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={resetAndClose}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1">
            {step === 'checkout' && (
              <button
                onClick={() => setStep('cart')}
                className="mr-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Volver al carrito"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {step === 'cart' ? 'Tu pedido' : 'Datos del pedido'}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
          </div>
        ) : step === 'cart' ? (
          <>
            {/* Items */}
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantLabel ?? ''}`} className="flex gap-3">
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
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-sm font-medium leading-tight line-clamp-1">{item.name}</p>
                      {item.variantLabel && (
                        <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
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

                  <button
                    onClick={() => removeItem(item.productId, item.variantLabel)}
                    className="self-start p-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold">{formatPriceShort(total)}</span>
              </div>
              <Button onClick={() => setStep('checkout')} className="w-full" size="lg">
                Continuar con el pedido
              </Button>
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
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto py-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="checkout-name">
                  Tu nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="checkout-name"
                  placeholder="¿Cómo te llamás?"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoComplete="given-name"
                />
              </div>

              {/* Tipo de entrega */}
              {hasShipping && (
                <div className="space-y-2">
                  <Label>Tipo de entrega</Label>
                  <RadioGroup
                    value={form.deliveryType}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, deliveryType: v as 'pickup' | 'shipping' }))
                    }
                    className="space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="pickup" id="delivery-pickup" />
                      <Label htmlFor="delivery-pickup" className="font-normal cursor-pointer">
                        Retiro en local
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="shipping" id="delivery-shipping" />
                      <Label htmlFor="delivery-shipping" className="font-normal cursor-pointer">
                        Envío a domicilio
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Dirección (condicional) */}
              {hasShipping && form.deliveryType === 'shipping' && (
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-address">Dirección de entrega</Label>
                  <Input
                    id="checkout-address"
                    placeholder="Calle, número, piso..."
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    autoComplete="street-address"
                  />
                </div>
              )}

              {/* Nota */}
              <div className="space-y-1.5">
                <Label htmlFor="checkout-note">Nota (opcional)</Label>
                <Textarea
                  id="checkout-note"
                  placeholder="Aclaraciones, preferencias..."
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Resumen */}
              <div className="rounded-lg border p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resumen
                </p>
                <div className="flex justify-between text-sm">
                  <span>
                    {items.length} {items.length === 1 ? 'producto' : 'productos'}
                  </span>
                  <span className="font-semibold">{formatPriceShort(total)}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="pt-4">
              <Button
                onClick={handleSend}
                disabled={!form.name.trim()}
                className="w-full"
                size="lg"
              >
                Enviar pedido por WhatsApp
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
