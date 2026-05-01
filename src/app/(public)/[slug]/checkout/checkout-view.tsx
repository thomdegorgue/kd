'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, ArrowLeftRight, Package, Smartphone } from 'lucide-react'
import { useStore } from '@/components/public/store-context'
import { useCartStore, useCartTotal } from '@/lib/stores/cart-store'
import { formatPriceShort } from '@/lib/utils/currency'
import { createCheckoutOrder } from '@/lib/actions/checkout'
import type { PublicPaymentMethod } from '@/lib/actions/checkout'

type Props = {
  paymentMethods: PublicPaymentMethod[]
}

type FormState = {
  name: string
  phone: string
  email: string
  deliveryType: 'pickup' | 'delivery'
  address: string
  paymentMethodId: string
}

const METHOD_ICON: Record<string, React.ReactNode> = {
  transfer: <ArrowLeftRight className="h-4 w-4" />,
  mp: <Smartphone className="h-4 w-4" />,
}

export function CheckoutView({ paymentMethods }: Props) {
  const store = useStore()
  const router = useRouter()
  const brand = store.config?.primary_color ?? '#0f0f0f'
  const brandSoft = store.config?.secondary_color ?? '#f5f5f5'

  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartTotal()
  const hasShipping = !!(store.modules as Record<string, boolean>).shipping

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    deliveryType: 'pickup',
    address: '',
    paymentMethodId: paymentMethods[0]?.id ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (items.length === 0) {
      router.replace(`/${store.slug}`)
    }
  }, [items.length, router, store.slug])

  const field = <K extends keyof FormState>(key: K) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  const isValid =
    form.name.trim().length >= 2 &&
    form.phone.replace(/\D/g, '').length >= 6 &&
    form.paymentMethodId &&
    (form.deliveryType === 'pickup' || form.address.trim().length > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || loading) return
    setLoading(true)
    setError(null)

    const result = await createCheckoutOrder({
      store_slug: store.slug,
      items: items.map((i) => ({
        product_id: i.productId,
        variant_id: null,
        quantity: i.quantity,
      })),
      customer: {
        name: form.name.trim(),
        phone: form.phone,
        email: form.email.trim() || null,
      },
      delivery: {
        type: form.deliveryType,
        address: form.deliveryType === 'delivery' ? form.address.trim() : null,
      },
      payment_method_id: form.paymentMethodId,
    })

    setLoading(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    clearCart()

    if (result.method === 'mp') {
      window.location.href = result.mp_init_point
      return
    }

    router.push(`/${store.slug}/checkout/success?order=${result.order_id}&method=transfer`)
  }

  if (items.length === 0) return null

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-1'

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur"
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold text-sm">Completar pedido</span>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-32">
        {/* Resumen del carrito */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tu pedido
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantLabel ?? ''}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div
                  className="h-10 w-10 rounded-lg shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: brandSoft }}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Package className="h-5 w-5" style={{ color: brand, opacity: 0.3 }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                  {item.variantLabel && (
                    <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatPriceShort(item.price * item.quantity)}</p>
                  <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t flex items-center justify-between bg-muted/20">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold">{formatPriceShort(total)}</span>
          </div>
        </div>

        {/* Datos del cliente */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tus datos
            </p>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Nombre <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                autoComplete="given-name"
                placeholder="¿Cómo te llamás?"
                className={inputClass}
                {...field('name')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Teléfono <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="Tu número de WhatsApp"
                className={inputClass}
                {...field('phone')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Email <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="Para recibir confirmación"
                className={inputClass}
                {...field('email')}
              />
            </div>
          </div>
        </div>

        {/* Entrega */}
        {hasShipping && (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Entrega
              </p>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(['pickup', 'delivery'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, deliveryType: type }))}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      form.deliveryType === type
                        ? 'border-2 bg-background'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                    style={form.deliveryType === type ? { borderColor: brand, color: brand } : {}}
                  >
                    {type === 'pickup' ? 'Retiro en local' : 'Envío a domicilio'}
                  </button>
                ))}
              </div>
              {form.deliveryType === 'delivery' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Dirección <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="street-address"
                    placeholder="Calle, número, piso..."
                    className={inputClass}
                    {...field('address')}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Método de pago */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Forma de pago
            </p>
          </div>
          <div className="px-4 py-4 space-y-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, paymentMethodId: pm.id }))}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  form.paymentMethodId === pm.id
                    ? 'border-2 bg-background'
                    : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
                style={form.paymentMethodId === pm.id ? { borderColor: brand, color: brand } : {}}
              >
                <span className={form.paymentMethodId === pm.id ? '' : 'text-muted-foreground'}>
                  {METHOD_ICON[pm.type]}
                </span>
                {pm.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </form>

      {/* Footer fijo */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur px-4 py-4 max-w-lg mx-auto">
        <button
          type="button"
          form="checkout-form"
          disabled={!isValid || loading}
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: brand }}
        >
          {loading ? 'Procesando...' : `Confirmar pedido · ${formatPriceShort(total)}`}
        </button>
      </div>
    </div>
  )
}
