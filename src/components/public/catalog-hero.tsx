'use client'

import Image from 'next/image'
import { useStore } from '@/components/public/store-context'

export function CatalogHero() {
  const store = useStore()
  const brand = store.config?.primary_color ?? '#0f0f0f'

  if (store.cover_url) {
    return (
      <div className="relative aspect-[21/9] sm:aspect-[3/1] w-full overflow-hidden rounded-b-2xl bg-muted">
        <Image
          src={store.cover_url}
          alt={store.name}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-0 flex items-end p-6">
          <div className="space-y-1 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Bienvenido a
            </p>
            <h2 className="text-2xl font-semibold leading-tight drop-shadow-sm">
              {store.name}
            </h2>
            {store.description && (
              <p className="text-sm text-white/85 max-w-md line-clamp-2">{store.description}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-b-2xl px-8 py-10 flex items-center"
      style={{ background: `${brand}10` }}
    >
      <div className="space-y-1.5">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: brand, opacity: 0.7 }}
        >
          Bienvenido a
        </p>
        <h2 className="text-2xl font-semibold leading-tight" style={{ color: brand }}>
          {store.name}
        </h2>
        {store.description ? (
          <p className="text-sm text-muted-foreground max-w-md">{store.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Explorá el catálogo y pedí por WhatsApp.
          </p>
        )}
      </div>
    </div>
  )
}
