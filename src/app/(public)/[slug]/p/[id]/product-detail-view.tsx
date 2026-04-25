'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { ArrowLeft, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/lib/stores/cart-store'
import { useStore } from '@/components/public/store-context'
import { formatPriceShort } from '@/lib/utils/currency'
import type { Product } from '@/lib/types'

interface ProductDetailViewProps {
  product: Product
  slug: string
}

export function ProductDetailView({ product, slug }: ProductDetailViewProps) {
  const router = useRouter()
  const store = useStore()
  const addItem = useCartStore((s) => s.addItem)
  const setStoreId = useCartStore((s) => s.setStoreId)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'
  const isDev = process.env.NODE_ENV === 'development'
  const storeUrl = isDev ? `${appUrl.replace(/\/$/, '')}/${slug}` : `https://${slug}.${domain}`
  const productUrl = `${storeUrl}/p/${product.id}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ? [product.image_url] : undefined,
    offers: {
      '@type': 'Offer',
      price: (product.price / 100).toFixed(2),
      priceCurrency: 'ARS',
      url: productUrl,
      availability: 'https://schema.org/InStock',
    },
  } as const

  useEffect(() => {
    setStoreId(store.id)
  }, [store.id, setStoreId])

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
    })
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
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
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
        </div>

        {/* Info */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold">{formatPriceShort(product.price)}</p>

          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          <Button onClick={handleAdd} size="lg" className="w-full sm:w-auto">
            <Plus className="mr-2 h-5 w-5" />
            Agregar al carrito
          </Button>
        </div>
      </div>
    </div>
  )
}
