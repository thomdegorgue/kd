'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Banner } from '@/lib/types'

interface BannerCarouselProps {
  banners: Banner[]
  autoplayMs?: number
}

export function BannerCarousel({ banners, autoplayMs = 5000 }: BannerCarouselProps) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % banners.length)
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1) return
    const id = setInterval(next, autoplayMs)
    return () => clearInterval(id)
  }, [banners.length, autoplayMs, next])

  if (banners.length === 0) return null

  const banner = banners[current]

  const content = (
    <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg bg-muted sm:aspect-[3/1]">
      <Image
        src={banner.image_url}
        alt={banner.title ?? ''}
        fill
        sizes="100vw"
        className="object-cover"
        priority={current === 0}
      />
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 flex flex-col items-start justify-end bg-gradient-to-t from-black/60 to-transparent p-4 sm:p-6">
          {banner.title && (
            <h2 className="text-lg font-bold text-white sm:text-2xl">{banner.title}</h2>
          )}
          {banner.subtitle && (
            <p className="text-sm text-white/80">{banner.subtitle}</p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-2">
      {banner.link_url ? (
        <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      ) : (
        content
      )}

      {/* Indicators */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Ir al banner ${i + 1}${b.title ? `: ${b.title}` : ''}`}
              aria-current={i === current ? 'true' : undefined}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === current ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
