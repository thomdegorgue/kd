'use client'

import { RotateCcw, Shield, Truck } from 'lucide-react'
import { useStore } from '@/components/public/store-context'

export function TrustBadges() {
  const store = useStore()

  const configured = store.config?.trust_badges ?? null
  const badges = Array.isArray(configured)
    ? configured.filter((b) => typeof b === 'string' && b.trim()).slice(0, 3)
    : null

  if (Array.isArray(configured) && badges && badges.length === 0) return null

  const fallback = ['Envío en 24–48hs', 'Compra segura', 'Cambio sin costo']
  const items = badges ?? fallback

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((label, idx) => {
        const Icon = idx === 0 ? Truck : idx === 1 ? Shield : RotateCcw
        return (
          <div
            key={`${label}-${idx}`}
            className="flex flex-col items-center gap-1 text-center bg-background rounded-xl py-3 border border-border"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground leading-tight px-1.5">
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
