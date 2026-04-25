'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, Minus, Plus, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/lib/stores/cart-store'
import { useStore } from '@/components/public/store-context'
import { formatPriceShort } from '@/lib/utils/currency'
import { buildWhatsAppMessage } from '@/lib/utils/whatsapp'
import type { Product } from '@/lib/types'
import type { PublicProductDetail, PublicProductVariant, ProductPageMeta } from '@/lib/db/queries/products'

interface ProductDetailViewProps {
  product: PublicProductDetail
  slug: string
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

function buildVariantLabel(attrs: Array<{ id: string; name: string }>, selected: Record<string, string>): string {
  const parts: string[] = []
  for (const a of attrs) {
    const v = selected[a.id]
    if (!v) continue
    parts.push(`${a.name}: ${v}`)
  }
  return parts.join(' · ')
}

function matchesVariant(variant: PublicProductVariant, selected: Record<string, string>): boolean {
  for (const [attrId, value] of Object.entries(selected)) {
    if (!value) continue
    if (variant.values[attrId] !== value) return false
  }
  return true
}

export function ProductDetailView({ product, slug }: ProductDetailViewProps) {
  const router = useRouter()
  const store = useStore()
  const addItem = useCartStore((s) => s.addItem)
  const setStoreId = useCartStore((s) => s.setStoreId)

  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [galleryIdx, setGalleryIdx] = useState(0)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'
  const isDev = process.env.NODE_ENV === 'development'
  const storeUrl = isDev ? `${appUrl.replace(/\/$/, '')}/${slug}` : `https://${slug}.${domain}`
  const productUrl = `${storeUrl}/p/${product.id}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comparePrice = (product as any).compare_price ?? ((product.metadata as any)?.compare_price as number | undefined)
  const hasCompare = typeof comparePrice === 'number' && comparePrice > product.price
  const savings = hasCompare ? comparePrice - product.price : null
  const savingsPct = hasCompare ? Math.round(((comparePrice - product.price) / comparePrice) * 100) : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stock = (product as any).stock as number | null | undefined
  const lowStock = typeof stock === 'number' && stock > 0 && stock < 5

  const hasVariants = !!store.modules.variants && !!product.variant_attributes?.length && !!product.variants?.length

  const pageMeta = ((product.metadata as Record<string, unknown> | null)?.page as ProductPageMeta | undefined)
  const hasProductPage = !!store.modules.product_page && pageMeta?.active === true
  const gallery = hasProductPage ? (pageMeta?.gallery_urls ?? []) : []
  const longDesc = hasProductPage ? pageMeta?.long_description : undefined
  const specs = hasProductPage ? (pageMeta?.specs ?? []) : []

  // Inicializar selección (primer valor por atributo, si existe)
  useEffect(() => {
    if (!hasVariants) return
    setSelected((prev) => {
      if (Object.keys(prev).length > 0) return prev
      const initial: Record<string, string> = {}
      for (const a of product.variant_attributes!) {
        const values = Array.from(
          new Set(product.variants!.map((v) => v.values[a.id]).filter(Boolean)),
        ) as string[]
        if (values.length) initial[a.id] = values[0]
      }
      return initial
    })
  }, [hasVariants, product.variant_attributes, product.variants])

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null
    return product.variants!.find((v) => matchesVariant(v, selected)) ?? null
  }, [hasVariants, product.variants, selected])

  const unitPrice = selectedVariant?.price ?? product.price
  const variantLabel = hasVariants && product.variant_attributes ? buildVariantLabel(product.variant_attributes, selected) : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ? [product.image_url] : undefined,
    offers: {
      '@type': 'Offer',
      price: (unitPrice / 100).toFixed(2),
      priceCurrency: 'ARS',
      url: productUrl,
      availability: 'https://schema.org/InStock',
    },
  } as const

  useEffect(() => {
    setStoreId(store.id)
  }, [store.id, setStoreId])

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        price: unitPrice,
        imageUrl: product.image_url,
        variantLabel: variantLabel || undefined,
      })
    }
  }

  const handleDirectWhatsApp = () => {
    const { whatsappUrl } = buildWhatsAppMessage({
      items: [
        {
          name: product.name,
          quantity: qty,
          unit_price: unitPrice,
          variant_label: variantLabel || undefined,
        },
      ],
      storeConfig: { name: store.name, whatsapp: store.whatsapp ?? '' },
    })
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => router.push(`/${slug}`)}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Volver al catálogo
      </Button>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sin imagen
            </div>
          )}
          {lowStock && (
            <span className="absolute top-3 right-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Solo quedan {stock}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>

            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <p className="text-2xl font-semibold tabular-nums">{formatPriceShort(unitPrice)}</p>
              {hasCompare && (
                <p className="text-sm text-muted-foreground line-through tabular-nums">
                  {formatPriceShort(comparePrice)}
                </p>
              )}
              {hasCompare && savings !== null && savings > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ahorrás {formatPriceShort(savings)}{savingsPct ? ` (${savingsPct}%)` : ''}
                </Badge>
              )}
            </div>

            {selectedVariant?.price !== null && selectedVariant && selectedVariant.price !== product.price && (
              <p className="text-xs text-muted-foreground">
                Precio según variante seleccionada.
              </p>
            )}
          </div>

          {/* Variants */}
          {hasVariants && product.variant_attributes && product.variants && (
            <div className="space-y-3">
              {product.variant_attributes.map((attr) => {
                const options = Array.from(
                  new Set(product.variants!.map((v) => v.values[attr.id]).filter(Boolean)),
                ) as string[]
                if (!options.length) return null

                const isColor = options.every((v) => isHexColor(v))

                return (
                  <div key={attr.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{attr.name}</p>
                      {selected[attr.id] && (
                        <p className="text-xs text-muted-foreground">{selected[attr.id]}</p>
                      )}
                    </div>

                    {isColor ? (
                      <div className="flex flex-wrap gap-2">
                        {options.map((v) => {
                          const active = selected[attr.id] === v
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setSelected((s) => ({ ...s, [attr.id]: v }))}
                              className="h-9 w-9 rounded-full border transition-shadow"
                              style={{
                                background: v,
                                borderColor: active ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                                boxShadow: active ? '0 0 0 3px hsl(var(--primary) / 0.25)' : undefined,
                              }}
                              aria-label={`${attr.name}: ${v}`}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {options.map((v) => {
                          const active = selected[attr.id] === v
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setSelected((s) => ({ ...s, [attr.id]: v }))}
                              className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                                active
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background hover:bg-accent border-border'
                              }`}
                            >
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {!selectedVariant && (
                <p className="text-xs text-destructive">Esa combinación no está disponible.</p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Cantidad</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Restar"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="min-w-12 text-center text-base font-semibold tabular-nums">{qty}</div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQty((q) => q + 1)}
                aria-label="Sumar"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Descripción</p>
              <div className="max-h-36 overflow-auto rounded-xl border bg-muted/20 p-3">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            </div>
          )}

          <Separator />

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={handleAdd}
              size="lg"
              className="w-full"
              disabled={hasVariants ? !selectedVariant : false}
            >
              <Plus className="mr-2 h-5 w-5" />
              Agregar al carrito
            </Button>
            <Button
              onClick={handleDirectWhatsApp}
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={!store.whatsapp || (hasVariants ? !selectedVariant : false)}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Pedido por WhatsApp
            </Button>
          </div>
        </div>
      </div>

      {/* Extended product page content */}
      {gallery.length > 0 && (
        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium">Galería</p>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            <Image
              src={gallery[galleryIdx]}
              alt={`${product.name} imagen ${galleryIdx + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 80vw"
              className="object-cover"
            />
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setGalleryIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-sm hover:bg-background"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryIdx((i) => (i + 1) % gallery.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-sm hover:bg-background"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {gallery.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setGalleryIdx(i)}
                      className={`h-1.5 w-1.5 rounded-full transition-colors ${i === galleryIdx ? 'bg-white' : 'bg-white/50'}`}
                      aria-label={`Ir a imagen ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIdx(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === galleryIdx ? 'border-primary' : 'border-transparent'}`}
                  aria-label={`Miniatura ${i + 1}`}
                >
                  <Image src={url} alt={`Miniatura ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {longDesc && (
        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium">Descripción detallada</p>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{longDesc}</p>
          </div>
        </div>
      )}

      {specs.length > 0 && (
        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium">Especificaciones</p>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <tbody>
                {specs.map((spec, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className="w-2/5 px-4 py-2.5 font-medium text-muted-foreground">{spec.key}</td>
                    <td className="px-4 py-2.5">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
