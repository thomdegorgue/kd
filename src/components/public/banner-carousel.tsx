'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useStore } from '@/components/public/store-context'
import type { Banner } from '@/lib/types'

interface BannerCarouselProps {
  banners: Banner[]
  autoplayMs?: number
}

export function BannerCarousel({ banners, autoplayMs = 4500 }: BannerCarouselProps) {
  const store = useStore()
  const brand = store.config?.primary_color ?? '#0f0f0f'
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || banners.length <= 1) return
    const id = setInterval(() => setSlide((s) => (s + 1) % banners.length), autoplayMs)
    return () => clearInterval(id)
  }, [paused, banners.length, autoplayMs])

  if (banners.length === 0) return null
  const banner = banners[slide]

  const inner = (
    <div
      className="relative h-52 overflow-hidden"
      style={{ background: brand }}
    >
      {/* Decoración geométrica */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/[0.08] pointer-events-none" />
      <div className="absolute -left-12 -bottom-16 h-52 w-52 rounded-full bg-white/[0.06] pointer-events-none" />
      <div className="absolute right-1/4 top-4 h-24 w-24 rounded-full bg-white/[0.04] pointer-events-none" />

      {/* Imagen de fondo si existe */}
      {banner.image_url && (
        <>
          <Image
            src={banner.image_url}
            alt={banner.title ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority={slide === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />
        </>
      )}

      <div key={slide} className="absolute inset-0 flex items-center px-8 animate-fade-in">
        <div className="space-y-2 max-w-sm">
          <span
            className="inline-block text-[10px] font-semibold tracking-[0.18em] uppercase px-2.5 py-0.5 rounded-full text-white/95"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            Destacado
          </span>
          {banner.title && (
            <h2 className="text-2xl font-semibold text-white leading-tight drop-shadow-sm">
              {banner.title}
            </h2>
          )}
          {banner.subtitle && (
            <p className="text-sm text-white/80 line-clamp-2">{banner.subtitle}</p>
          )}
          {banner.link_url && (
            <span
              className="mt-2 inline-block text-xs font-semibold px-4 py-1.5 rounded-full text-white"
              style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(4px)' }}
            >
              Ver más →
            </span>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banner.link_url ? (
        <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      ) : (
        inner
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              aria-label={`Ir al banner ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                height: 6,
                width: i === slide ? 18 : 6,
                background: i === slide ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
