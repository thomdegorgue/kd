'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  MessageCircle,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Truck,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/components/public/store-context'
import { useCartStore } from '@/lib/stores/cart-store'
import { getProductDetail } from '@/lib/actions/catalog-public'
import { formatPriceShort } from '@/lib/utils/currency'
import { buildWhatsAppMessage } from '@/lib/utils/whatsapp'
import type {
  ProductPageMeta,
  PublicProductDetail,
  PublicProductVariant,
} from '@/lib/db/queries/products'

interface ProductDetailDrawerProps {
  productId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded?: () => void
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

function buildVariantLabel(
  attrs: Array<{ id: string; name: string }>,
  selected: Record<string, string>,
): string {
  const parts: string[] = []
  for (const a of attrs) {
    const v = selected[a.id]
    if (!v) continue
    parts.push(`${a.name}: ${v}`)
  }
  return parts.join(' · ')
}

function matchesVariant(
  variant: PublicProductVariant,
  selected: Record<string, string>,
): boolean {
  for (const [attrId, value] of Object.entries(selected)) {
    if (!value) continue
    if (variant.values[attrId] !== value) return false
  }
  return true
}

function buildInitialSelected(product: PublicProductDetail): Record<string, string> {
  if (!product.variant_attributes?.length || !product.variants?.length) return {}
  const initial: Record<string, string> = {}
  for (const a of product.variant_attributes) {
    const values = Array.from(
      new Set(product.variants.map((v) => v.values[a.id]).filter(Boolean)),
    ) as string[]
    if (values.length) initial[a.id] = values[0]
  }
  return initial
}

export function ProductDetailDrawer({
  productId,
  open,
  onOpenChange,
  onAdded,
}: ProductDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:w-[440px] lg:w-[480px] xl:w-[520px] flex flex-col gap-0 p-0"
      >
        {productId ? (
          <DrawerBody
            key={productId}
            productId={productId}
            onClose={() => onOpenChange(false)}
            onAdded={onAdded}
          />
        ) : (
          <DrawerHeader title="Detalle de producto" onClose={() => onOpenChange(false)} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function DrawerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Volver"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <SheetTitle className="flex-1 truncate text-sm font-semibold">{title}</SheetTitle>
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Cerrar"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </div>
  )
}

interface DrawerBodyProps {
  productId: string
  onClose: () => void
  onAdded?: () => void
}

function DrawerBody({ productId, onClose, onAdded }: DrawerBodyProps) {
  const store = useStore()
  const addItem = useCartStore((s) => s.addItem)

  const brand = store.config?.primary_color ?? 'hsl(var(--primary))'
  const brandSoft = store.config?.secondary_color ?? '#f5f5f5'

  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<PublicProductDetail | null>(null)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [qty, setQty] = useState(1)
  const [galleryIdx, setGalleryIdx] = useState(0)

  useEffect(() => {
    let cancelled = false
    getProductDetail(store.id, productId, {
      includeVariants: !!store.modules.variants,
    }).then((p) => {
      if (cancelled) return
      setProduct(p)
      if (p) setSelected(buildInitialSelected(p))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [productId, store.id, store.modules.variants])

  const hasVariants = !!(
    product &&
    store.modules.variants &&
    product.variant_attributes?.length &&
    product.variants?.length
  )

  const selectedVariant = useMemo(() => {
    if (!hasVariants || !product?.variants) return null
    return product.variants.find((v) => matchesVariant(v, selected)) ?? null
  }, [hasVariants, product, selected])

  const unitPrice = selectedVariant?.price ?? product?.price ?? 0
  const variantLabel =
    hasVariants && product?.variant_attributes
      ? buildVariantLabel(product.variant_attributes, selected)
      : undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comparePrice = (product as any)?.compare_price as number | undefined
  const hasCompare = typeof comparePrice === 'number' && comparePrice > unitPrice
  const savingsPct = hasCompare
    ? Math.round(((comparePrice! - unitPrice) / comparePrice!) * 100)
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stock = (product as any)?.stock as number | null | undefined
  const stockActive = !!store.modules.stock
  const noStock = stockActive && stock === 0
  const lowStock = stockActive && typeof stock === 'number' && stock > 0 && stock <= 5

  const productPageActive = !!store.modules.product_page
  const pageMeta = useMemo<ProductPageMeta | undefined>(() => {
    if (!product?.metadata) return undefined
    return (product.metadata as Record<string, unknown>).page as ProductPageMeta | undefined
  }, [product])
  const hasProductPage = productPageActive && pageMeta?.active === true
  const longDesc = hasProductPage ? pageMeta?.long_description : undefined
  const specs = hasProductPage ? pageMeta?.specs ?? [] : []

  const allImages = useMemo(() => {
    if (!product) return []
    const arr: string[] = []
    if (product.image_url) arr.push(product.image_url)
    const gal = hasProductPage ? pageMeta?.gallery_urls ?? [] : []
    for (const url of gal) if (url && !arr.includes(url)) arr.push(url)
    return arr
  }, [product, hasProductPage, pageMeta])

  const currentImage = allImages[galleryIdx] ?? null

  const handleAdd = useCallback(() => {
    if (!product || noStock) return
    if (hasVariants && !selectedVariant) return
    for (let i = 0; i < qty; i++) {
      addItem({
        productId: product.id,
        name: product.name,
        price: unitPrice,
        imageUrl: product.image_url,
        variantLabel: variantLabel || undefined,
      })
    }
    onAdded?.()
    onClose()
  }, [
    product,
    noStock,
    hasVariants,
    selectedVariant,
    qty,
    unitPrice,
    variantLabel,
    addItem,
    onAdded,
    onClose,
  ])

  const handleWhatsApp = useCallback(() => {
    if (!product || !store.whatsapp) return
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
  }, [product, store.whatsapp, store.name, qty, unitPrice, variantLabel])

  const trustItems = useMemo(() => {
    const configured = store.config?.trust_badges ?? null
    const fallback = ['Envío en 24–48hs', 'Compra segura', 'Cambio sin costo']
    const labels = Array.isArray(configured) && configured.length > 0
      ? configured.filter((b) => typeof b === 'string' && b.trim()).slice(0, 3)
      : fallback
    return labels.map((label, i) => ({
      label,
      Icon: i === 0 ? Truck : i === 1 ? Shield : RotateCcw,
    }))
  }, [store.config?.trust_badges])

  if (loading || !product) {
    return (
      <>
        <DrawerHeader title="Cargando..." onClose={onClose} />
        <DetailSkeleton brandSoft={brandSoft} />
      </>
    )
  }

  return (
    <>
      <DrawerHeader title={product.name} onClose={onClose} />

      <ScrollArea className="flex-1 min-h-0">
        <div
          className="relative aspect-square w-full"
          style={{ background: brandSoft }}
        >
          {currentImage ? (
            <Image
              src={currentImage}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 520px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-24 w-24" style={{ color: brand, opacity: 0.18 }} />
            </div>
          )}

          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {hasCompare && savingsPct !== null && savingsPct > 0 && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-md text-white"
                style={{ background: brand }}
              >
                -{savingsPct}%
              </span>
            )}
            {noStock && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                Sin stock
              </span>
            )}
          </div>

          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setGalleryIdx((i) => (i - 1 + allImages.length) % allImages.length)
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-sm transition-colors hover:bg-background"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setGalleryIdx((i) => (i + 1) % allImages.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 shadow-sm transition-colors hover:bg-background"
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGalleryIdx(i)}
                    aria-label={`Ir a imagen ${i + 1}`}
                    className="rounded-full transition-all"
                    style={{
                      height: 6,
                      width: i === galleryIdx ? 18 : 6,
                      background:
                        i === galleryIdx
                          ? 'rgba(255,255,255,0.95)'
                          : 'rgba(255,255,255,0.55)',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-none">
            {allImages.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setGalleryIdx(i)}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                  i === galleryIdx ? '' : 'border-transparent'
                }`}
                style={i === galleryIdx ? { borderColor: brand } : undefined}
                aria-label={`Miniatura ${i + 1}`}
              >
                <Image src={url} alt={`Miniatura ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-5 p-5">
          <div>
            <h2 className="text-lg font-semibold leading-tight">{product.name}</h2>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: brand }}>
                {formatPriceShort(unitPrice)}
              </span>
              {hasCompare && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPriceShort(comparePrice!)}
                </span>
              )}
            </div>
            {hasCompare && (
              <Badge variant="secondary" className="mt-2 gap-1">
                <Sparkles className="h-3 w-3" />
                Ahorrás {formatPriceShort(comparePrice! - unitPrice)}
              </Badge>
            )}
          </div>

          <Separator />

          {hasVariants && product.variant_attributes && product.variants && (
            <div className="space-y-4">
              {product.variant_attributes.map((attr) => {
                const options = Array.from(
                  new Set(product.variants!.map((v) => v.values[attr.id]).filter(Boolean)),
                ) as string[]
                if (!options.length) return null
                const isColor = options.every((v) => isHexColor(v))

                return (
                  <div key={attr.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {attr.name}
                      </p>
                      {selected[attr.id] && !isColor && (
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
                              className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                              style={{
                                background: v,
                                borderColor: active ? brand : 'transparent',
                                outlineOffset: 2,
                                outline: active ? `2px solid ${brand}` : 'none',
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
                              className="h-9 min-w-11 rounded-lg border px-3 text-xs font-semibold transition-colors"
                              style={
                                active
                                  ? { background: brand, color: '#fff', borderColor: brand }
                                  : { borderColor: 'hsl(var(--border))' }
                              }
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
                <p className="text-xs text-destructive">
                  Esa combinación no está disponible.
                </p>
              )}
            </div>
          )}

          {stockActive && typeof stock === 'number' && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: noStock ? 'hsl(var(--destructive))' : brand }}
              />
              <span className="text-muted-foreground">
                {noStock
                  ? 'Sin stock'
                  : lowStock
                    ? `Últimas ${stock} unidades`
                    : `${stock} unidades disponibles`}
              </span>
            </div>
          )}

          {product.description && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Descripción
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          {longDesc && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Más información
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {longDesc}
              </p>
            </div>
          )}

          {specs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Especificaciones
              </p>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-xs">
                  <tbody>
                    {specs.map((spec, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                        <td className="w-2/5 px-3 py-2 font-medium text-muted-foreground">
                          {spec.key}
                        </td>
                        <td className="px-3 py-2">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {trustItems.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-xl bg-muted p-3 text-center"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-background p-4 space-y-3 shrink-0">
        <div className="flex items-stretch gap-3">
          <div
            className="flex items-stretch h-11 rounded-xl overflow-hidden border-2"
            style={{ borderColor: brand }}
          >
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 flex items-center justify-center transition-colors hover:bg-muted/40"
              aria-label="Restar"
            >
              <Minus className="h-3.5 w-3.5" style={{ color: brand }} />
            </button>
            <span
              className="w-10 flex items-center justify-center text-sm font-bold"
              style={{ color: brand }}
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="w-9 flex items-center justify-center text-white transition-opacity hover:opacity-90"
              style={{ background: brand }}
              aria-label="Sumar"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={noStock || (hasVariants && !selectedVariant)}
            className="flex-1 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: brand }}
          >
            {noStock ? 'Sin stock' : `Agregar · ${formatPriceShort(unitPrice * qty)}`}
          </button>
        </div>

        {store.whatsapp && !noStock && (
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={hasVariants && !selectedVariant}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#25D366' }}
          >
            <MessageCircle className="h-4 w-4" />
            Pedir directo por WhatsApp
          </button>
        )}
      </div>
    </>
  )
}

function DetailSkeleton({ brandSoft }: { brandSoft: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <div
        className="relative aspect-square w-full flex items-center justify-center"
        style={{ background: brandSoft }}
      >
        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
      </div>
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-7 w-1/3" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="mt-auto border-t border-border p-4">
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  )
}
