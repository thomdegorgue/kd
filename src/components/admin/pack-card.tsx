'use client'

import { Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { Pack } from '@/lib/billing/packs'

type PackCardProps = {
  pack: Pack
  isActive: boolean
  onToggle?: (enabled: boolean) => void
  disabled?: boolean
  isLoading?: boolean
}

export function PackCard({
  pack,
  isActive,
  onToggle,
  disabled = false,
  isLoading = false,
}: PackCardProps) {
  const isFeatured = pack.is_featured

  return (
    <Card
      className={`transition-all duration-200 ${
        isFeatured
          ? 'border-violet-300/60 bg-gradient-to-br from-violet-50 to-white shadow-md'
          : isActive
            ? 'border-primary/50 bg-primary/5 shadow-sm'
            : 'hover:shadow-sm'
      }`}
    >
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Header: ícono + label + tier badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold leading-tight">{pack.label}</h3>
              {isFeatured && (
                <Badge variant="default" className="gap-0.5 text-[10px]">
                  <Zap className="h-2.5 w-2.5" />
                  Estrella
                </Badge>
              )}
              {!pack.is_paid && (
                <Badge variant="secondary" className="text-[10px]">
                  Incluido
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {pack.description}
            </p>
          </div>
          {pack.is_paid && !disabled && (
            <Switch
              checked={isActive}
              onCheckedChange={onToggle}
              disabled={disabled || isLoading}
              aria-label={`${pack.is_paid ? 'Activar' : 'Estado'} ${pack.label}`}
            />
          )}
        </div>

        {/* Módulos como chips */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {pack.modules.map(m => (
              <Badge
                key={m}
                variant="secondary"
                className="text-[10px] font-normal px-2 py-0.5"
              >
                {m}
              </Badge>
            ))}
          </div>
        </div>

        {/* Precio */}
        {pack.is_paid && (
          <div className="pt-2 border-t">
            <p className="text-2xl font-bold text-primary">$10.000</p>
            <p className="text-xs text-muted-foreground">por mes</p>
          </div>
        )}

        {/* CTA opcional */}
        {pack.cta && (
          <div className="text-xs font-medium text-violet-600 pt-1">
            {pack.cta}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
