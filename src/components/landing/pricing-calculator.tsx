'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  formatARS,
} from '@/lib/billing/calculator'
import { PACKS, computePackTotal } from '@/lib/billing/packs'
import type { PackId } from '@/lib/billing/packs'

const TIERS = [100, 200, 300, 500, 1000, 2000] as const
const PRICE_PER_100_PRODUCTS = 2000000 // $20.000 ARS en centavos

export function PricingCalculator() {
  const [maxProducts, setMaxProducts] = useState<number>(100)
  const [activePacks, setActivePacks] = useState<Set<PackId>>(new Set())

  const operationalPacks = activePacks.has('operations') && activePacks.has('finance') && activePacks.has('team')
  const packPricing = computePackTotal(Array.from(activePacks) as PackId[])
  const baseTierPrice = Math.ceil(maxProducts / 100) * PRICE_PER_100_PRODUCTS
  const total = baseTierPrice + packPricing.total

  function handlePackToggle(packId: PackId, checked: boolean) {
    const newPacks = new Set(activePacks)
    if (checked) {
      newPacks.add(packId)
    } else {
      newPacks.delete(packId)
    }
    setActivePacks(newPacks)
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-24">
      {/* Tier selector */}
      <div id="precio" className="mb-14">
        <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73] mb-4">
          ¿Cuántos productos tenés?
        </p>
        <div className="flex flex-wrap gap-2">
          {TIERS.map(tier => (
            <button
              key={tier}
              type="button"
              onClick={() => setMaxProducts(tier)}
              className={`h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border ${
                maxProducts === tier
                  ? 'bg-[#1b1b1b] text-white border-[#1b1b1b] shadow-sm'
                  : 'bg-white text-[#6e6e73] border-[#e0e0e0] hover:border-[#1b1b1b] hover:text-[#1b1b1b]'
              }`}
            >
              {tier.toLocaleString('es-AR')}
            </button>
          ))}
          <span className="flex items-center text-sm text-[#6e6e73] pl-1">productos</span>
        </div>
      </div>

      {/* Packs grid */}
      <div id="packs" className="mb-14">
        <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73] mb-8">
          Elige los módulos que necesitás
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PACKS.map(pack => {
            const isActive = activePacks.has(pack.id as PackId)
            const isFeatured = pack.is_featured

            return (
              <div
                key={pack.id}
                className={`border rounded-xl p-5 transition-all ${
                  isFeatured
                    ? 'border-violet-300/60 bg-gradient-to-br from-violet-50 to-white shadow-md'
                    : isActive
                      ? 'border-[#1b1b1b]/20 bg-[#f9f9f9]'
                      : 'border-[#e0e0e0] bg-white hover:border-[#1b1b1b]/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-[#1b1b1b]">{pack.label}</h3>
                      {isFeatured && (
                        <Badge className="gap-0.5 text-[10px] bg-violet-600">
                          <Zap className="h-2.5 w-2.5" />
                          Destacado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#6e6e73] line-clamp-2">{pack.description}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 pb-4 border-b border-[#e0e0e0]">
                  {pack.modules.map(m => (
                    <div key={m} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="text-[10px] text-[#6e6e73]">{m}</span>
                    </div>
                  ))}
                </div>

                {pack.is_paid && (
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-[#1b1b1b]">$10.000</p>
                    <p className="text-xs text-[#6e6e73]">por mes</p>
                  </div>
                )}

                {pack.id !== 'core' && (
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) => handlePackToggle(pack.id as PackId, checked)}
                    aria-label={`${pack.label}`}
                  />
                )}
                {pack.id === 'core' && (
                  <p className="text-xs text-emerald-600 font-medium">Siempre incluido</p>
                )}
              </div>
            )
          })}
        </div>
        {operationalPacks && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-800 font-medium">
              ✓ 3 packs operacionales activos — Descuento bundle aplicado (-$5.000/mes)
            </p>
          </div>
        )}
      </div>

      {/* Summary card */}
      <div className="border border-[#e0e0e0] rounded-2xl p-8 bg-[#f9f9f9]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">

          {/* Breakdown */}
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73]">
              Detalle del costo
            </p>
            <div className="space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-sm text-[#6e6e73]">
                  {formatARS(PRICE_PER_100_PRODUCTS)} × {Math.ceil(maxProducts / 100)}{' '}
                  {Math.ceil(maxProducts / 100) === 1 ? 'bloque' : 'bloques'} de 100 productos
                </span>
                <span className="text-sm font-semibold text-[#1b1b1b]">
                  = {formatARS(baseTierPrice)}
                </span>
              </div>
              {Array.from(activePacks).length > 0 && (
                <>
                  {Array.from(activePacks).map((packId) => {
                    const pack = PACKS.find(p => p.id === packId)
                    if (!pack || !pack.is_paid) return null
                    return (
                      <div key={packId} className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-sm text-[#6e6e73]">+ {pack.label}</span>
                        <span className="text-sm font-semibold text-violet-600">
                          + {formatARS(1000000)}
                        </span>
                      </div>
                    )
                  })}
                  {operationalPacks && packPricing.bundleDiscount > 0 && (
                    <div className="flex items-baseline gap-3 flex-wrap text-emerald-600">
                      <span className="text-sm text-emerald-700">Descuento bundle (3 packs)</span>
                      <span className="text-sm font-semibold">
                        − {formatARS(packPricing.bundleDiscount)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {Array.from(activePacks).length === 0 && (
                <p className="text-sm text-[#6e6e73]/60 italic">
                  Activá packs para verlos reflejados en el total.
                </p>
              )}
            </div>
          </div>

          {/* Total + CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 lg:flex-shrink-0">
            <div>
              <p className="text-xs text-[#6e6e73] mb-1.5 uppercase tracking-wider font-medium">
                Total mensual
              </p>
              <p className="text-5xl font-bold tracking-tighter tabular-nums text-[#1b1b1b] transition-all duration-300">
                {formatARS(total)}
              </p>
              <p className="text-xs text-[#6e6e73] mt-1.5">
                / mes · sin permanencia
              </p>
            </div>
            <Button
              render={<Link href="/auth/signup" />}
              className="h-12 px-8 text-sm font-semibold rounded-full bg-[#1b1b1b] text-white border-0 hover:bg-[#1b1b1b]/85 whitespace-nowrap transition-all"
            >
              Empezar gratis →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
