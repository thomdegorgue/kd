'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  CreditCard,
  MessageCircle,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  X,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  const router = useRouter()
  const brand = store.config?.primary_color ?? '#0f0f0f'
  const brandSoft = store.config?.secondary_color ?? '#f5f5f5'

  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartTotal()

  const [step, setStep] = useState<'cart' | 'checkout'>('cart')
  const [form, setForm] = useState<CheckoutForm>(INITIAL_FORM)
  const [showPreview, setShowPreview] = useState(false)

  const hasShipping = !!store.modules.shipping
  const hasOnlineCheckout = !!(store.modules as Record<string, boolean>).checkout
  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  const resetAndClose = (open: boolean) => {
    if (!open) {
      setStep('cart')
      setForm(INITIAL_FORM)
    }
    onOpenChange(open)
  }

  const preview = buildWhatsAppMessage({
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

  const handleSend = () => {
    const { whatsappUrl } = preview
    window.open(whatsappUrl, '_blank')
    clearCart()
    setStep('cart')
    setForm(INITIAL_FORM)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={resetAndClose}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:w-[420px] lg:w-[460px] xl:w-[500px] flex flex-col gap-0 p-0 bg-background"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/80 bg-muted/20 shrink-0">
          <SheetTitle className="text-sm font-semibold flex items-center gap-2">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Volver"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <ShoppingCart className="h-4 w-4" />
            <span className="flex-1">
              {step === 'cart' ? `Carrito (${cartCount})` : 'Datos del pedido'}
            </span>
            <button
              type="button"
              onClick={() => resetAndClose(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetTitle>
        </div>

        {items.length === 0 ? (
          <EmptyCart />
        ) : step === 'cart' ? (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantLabel ?? ''}`}
                    className="flex gap-3 p-4"
                  >
                    <div
                      className="relative h-16 w-16 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ background: brandSoft }}
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <Package
                          className="h-7 w-7"
                          style={{ color: brand, opacity: 0.3 }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight line-clamp-1">
                        {item.name}
                      </p>
                      {item.variantLabel && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {item.variantLabel}
                        </p>
                      )}
                      <p className="text-xs font-semibold mt-0.5" style={{ color: brand }}>
                        {formatPriceShort(item.price)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="flex items-stretch h-7 rounded-lg overflow-hidden border"
                          style={{ borderColor: brand }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity - 1,
                                item.variantLabel,
                              )
                            }
                            className="w-7 flex items-center justify-center transition-colors hover:bg-muted/40"
                            aria-label="Restar"
                          >
                            <Minus className="h-2.5 w-2.5" style={{ color: brand }} />
                          </button>
                          <span
                            className="w-7 flex items-center justify-center text-xs font-bold"
                            style={{ color: brand }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.quantity + 1,
                                item.variantLabel,
                              )
                            }
                            className="w-7 flex items-center justify-center text-white transition-opacity hover:opacity-90"
                            style={{ background: brand }}
                            aria-label="Sumar"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <span
                          className="text-xs font-semibold ml-auto"
                          style={{ color: brand }}
                        >
                          {formatPriceShort(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.variantLabel)}
                      className="self-start text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Eliminar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-border/80 p-5 space-y-3 bg-muted/10 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="text-lg font-bold">{formatPriceShort(total)}</span>
              </div>
              {hasOnlineCheckout ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      router.push(`/${store.slug}/checkout`)
                    }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ background: brand }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Pagar online
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('checkout')}
                    className="w-full py-2.5 rounded-xl text-sm font-medium border border-border bg-background hover:bg-muted/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    Pedir por WhatsApp
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: brand }}
                >
                  Continuar al pedido
                </button>
              )}
              <button
                type="button"
                onClick={clearCart}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Vaciar carrito
              </button>
            </div>
          </>
        ) : (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-5 py-5 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="checkout-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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

                {hasShipping && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tipo de entrega
                    </Label>
                    <RadioGroup
                      value={form.deliveryType}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, deliveryType: v as 'pickup' | 'shipping' }))
                      }
                      className="space-y-1.5"
                    >
                      <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer">
                        <RadioGroupItem value="pickup" id="delivery-pickup" />
                        <Label htmlFor="delivery-pickup" className="text-sm font-normal cursor-pointer flex-1">
                          Retiro en local
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer">
                        <RadioGroupItem value="shipping" id="delivery-shipping" />
                        <Label htmlFor="delivery-shipping" className="text-sm font-normal cursor-pointer flex-1">
                          Envío a domicilio
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {hasShipping && form.deliveryType === 'shipping' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="checkout-address" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Dirección
                    </Label>
                    <Input
                      id="checkout-address"
                      placeholder="Calle, número, piso..."
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      autoComplete="street-address"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="checkout-note" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nota (opcional)
                  </Label>
                  <Textarea
                    id="checkout-note"
                    placeholder="Aclaraciones, preferencias..."
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Resumen
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {items.length} {items.length === 1 ? 'producto' : 'productos'} ·{' '}
                      {cartCount} ítems
                    </span>
                    <span className="font-bold">{formatPriceShort(total)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <button
                    type="button"
                    onClick={() => setShowPreview((v) => !v)}
                    className="w-full flex items-center justify-between text-xs font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                      Vista previa del mensaje
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {showPreview ? 'Ocultar' : 'Ver'}
                    </span>
                  </button>
                  {showPreview && (
                    <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-[11px] text-muted-foreground leading-relaxed border border-border">
{preview.messageText}
                    </pre>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="border-t border-border/80 p-5 space-y-2 bg-muted/10 shrink-0">
              <button
                type="button"
                onClick={handleSend}
                disabled={!form.name.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" />
                Confirmar por WhatsApp
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                Serás redirigido a WhatsApp para finalizar tu pedido
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <ShoppingCart className="h-9 w-9 text-muted-foreground/30 mb-3" />
      <p className="text-sm font-medium">Tu carrito está vacío</p>
      <p className="text-xs text-muted-foreground mt-1">
        Agregá productos para continuar
      </p>
    </div>
  )
}
