'use client'

import { Truck, Shield, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useStore } from '@/components/public/store-context'

export function TrustBadges() {
  const store = useStore()

  const configured = store.config?.trust_badges ?? null
  const badges = Array.isArray(configured)
    ? configured.filter((b) => typeof b === 'string' && b.trim()).slice(0, 3)
    : null

  // Si está configurado explícitamente como [] => no mostrar.
  if (Array.isArray(configured) && badges && badges.length === 0) return null

  const fallbackBadges = ['Envío en 24–48hs', 'Compra segura', 'Cambio sin costo']
  const items = badges ?? fallbackBadges

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {items.map((text, idx) => {
        const Icon = idx === 0 ? Truck : idx === 1 ? Shield : RotateCcw
        return (
          <Card key={text} className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2" />
            <h4 className="text-xs sm:text-sm font-medium leading-tight">{text}</h4>
          </Card>
        )
      })}
    </div>
  )
}
