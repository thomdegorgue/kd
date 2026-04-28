'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatARS } from '@/lib/billing/calculator'
import { PACKS, computePackTotal } from '@/lib/billing/packs'
import type { PackId } from '@/lib/billing/packs'

const TIERS = [100, 200, 300, 500, 1000, 2000] as const
const PRICE_PER_100_PRODUCTS = 2000000

const FAQ_ITEMS = [
  {
    q: '¿Puedo cambiar de pack en cualquier momento?',
    a: 'Sí. Podés activar o desactivar packs desde la configuración de tu tienda. Los cambios se aplican al siguiente período de facturación.',
  },
  {
    q: '¿Qué pasa si dejo de pagar?',
    a: 'Tu tienda pasa a modo lectura: los clientes pueden ver el catálogo pero no pueden hacer pedidos nuevos. Tus datos se conservan por 90 días.',
  },
  {
    q: '¿Cómo cancelo mi suscripción?',
    a: 'Podés cancelar en cualquier momento desde Configuración → Facturación, sin cargos adicionales ni permanencia mínima.',
  },
  {
    q: '¿Hay período de prueba?',
    a: 'Sí, 14 días gratis con acceso a todos los módulos. No se requiere tarjeta de crédito para empezar.',
  },
]

function PricingSummary({
  maxProducts,
  activePacks,
  operationalPacks,
  baseTierPrice,
  packPricing,
  total,
  totalWithoutDiscount,
  compact = false,
}: {
  maxProducts: number
  activePacks: Set<PackId>
  operationalPacks: boolean
  baseTierPrice: number
  packPricing: ReturnType<typeof computePackTotal>
  total: number
  totalWithoutDiscount: number
  compact?: boolean
}) {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      {!compact && (
        <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73]">
          Tu plan
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[#6e6e73]">
            {Math.ceil(maxProducts / 100)} bloque{Math.ceil(maxProducts / 100) > 1 ? 's' : ''} de 100 productos
          </span>
          <span className="text-xs font-semibold text-[#1b1b1b] tabular-nums">
            {formatARS(baseTierPrice)}
          </span>
        </div>
        {Array.from(activePacks).map((packId) => {
          const pack = PACKS.find(p => p.id === packId)
          if (!pack || !pack.is_paid) return null
          return (
            <div key={packId} className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#6e6e73]">+ {pack.label}</span>
              <span className="text-xs font-semibold text-violet-600 tabular-nums">
                {operationalPacks ? (
                  <span className="line-through text-[#6e6e73] mr-1">{formatARS(1000000)}</span>
                ) : null}
                {formatARS(1000000)}
              </span>
            </div>
          )
        })}
        {operationalPacks && packPricing.bundleDiscount > 0 && (
          <div className="flex items-center justify-between gap-2 text-emerald-600">
            <span className="text-xs">Descuento bundle (3 packs)</span>
            <span className="text-xs font-semibold tabular-nums">
              − {formatARS(packPricing.bundleDiscount)}
            </span>
          </div>
        )}
      </div>

      <div className={`border-t pt-3 ${compact ? 'flex items-center justify-between gap-3' : ''}`}>
        {compact ? (
          <>
            <div>
              <p className="text-[10px] text-[#6e6e73] uppercase tracking-wider">Total/mes</p>
              <div className="flex items-baseline gap-2">
                {operationalPacks && packPricing.bundleDiscount > 0 && (
                  <span className="text-sm line-through text-[#6e6e73] tabular-nums">
                    {formatARS(totalWithoutDiscount)}
                  </span>
                )}
                <span className="text-2xl font-bold tracking-tighter tabular-nums text-[#1b1b1b]">
                  {formatARS(total)}
                </span>
              </div>
            </div>
            <Button
              render={<Link href="/auth/signup" />}
              className="h-11 px-6 text-sm font-semibold rounded-full bg-[#1b1b1b] text-white border-0 hover:bg-[#1b1b1b]/85 whitespace-nowrap shrink-0"
            >
              Empezar gratis →
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-[#6e6e73] uppercase tracking-wider mb-2">Total mensual</p>
            <div className="flex items-baseline gap-3">
              {operationalPacks && packPricing.bundleDiscount > 0 && (
                <span className="text-xl line-through text-[#6e6e73] tabular-nums">
                  {formatARS(totalWithoutDiscount)}
                </span>
              )}
              <span className="text-4xl font-bold tracking-tighter tabular-nums text-[#1b1b1b]">
                {formatARS(total)}
              </span>
            </div>
            <p className="text-xs text-[#6e6e73] mt-1">/ mes · sin permanencia</p>
            <Button
              render={<Link href="/auth/signup" />}
              className="w-full mt-4 h-12 text-sm font-semibold rounded-full bg-[#1b1b1b] text-white border-0 hover:bg-[#1b1b1b]/85"
            >
              Empezar gratis →
            </Button>
            <p className="text-xs text-center text-[#6e6e73] mt-2">14 días gratis, sin tarjeta</p>
          </>
        )}
      </div>
    </div>
  )
}

export function PricingCalculator() {
  const [maxProducts, setMaxProducts] = useState<number>(100)
  const [activePacks, setActivePacks] = useState<Set<PackId>>(new Set())
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const operationalPacks = activePacks.has('operations') && activePacks.has('finance') && activePacks.has('team')
  const packPricing = computePackTotal(Array.from(activePacks) as PackId[])
  const baseTierPrice = Math.ceil(maxProducts / 100) * PRICE_PER_100_PRODUCTS
  const total = baseTierPrice + packPricing.total

  // Para el bundle tachado: precio sin descuento
  const totalWithoutDiscount = baseTierPrice + (packPricing.total + packPricing.bundleDiscount)

  const tierIndex = TIERS.indexOf(maxProducts as typeof TIERS[number])

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const idx = Number(e.target.value)
    setMaxProducts(TIERS[idx] ?? TIERS[0])
  }

  function handlePackToggle(packId: PackId, checked: boolean) {
    const newPacks = new Set(activePacks)
    if (checked) newPacks.add(packId)
    else newPacks.delete(packId)
    setActivePacks(newPacks)
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        {/* Tier slider */}
        <div id="precio" className="mb-14">
          <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73] mb-4">
            ¿Cuántos productos tenés?
          </p>
          <div className="space-y-4">
            {/* Slider */}
            <div className="relative">
              <input
                type="range"
                min={0}
                max={TIERS.length - 1}
                step={1}
                value={tierIndex >= 0 ? tierIndex : 0}
                onChange={handleSliderChange}
                className="w-full h-2 appearance-none bg-[#e0e0e0] rounded-full cursor-pointer accent-[#1b1b1b]"
                aria-label="Cantidad de productos"
              />
              {/* Tick labels */}
              <div className="flex justify-between mt-2 px-0">
                {TIERS.map((tier, i) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setMaxProducts(tier)}
                    className={`text-xs transition-colors ${
                      tierIndex === i ? 'text-[#1b1b1b] font-semibold' : 'text-[#6e6e73]'
                    }`}
                  >
                    {tier >= 1000 ? `${tier / 1000}k` : tier}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-2xl font-bold text-[#1b1b1b] tabular-nums">
              {maxProducts.toLocaleString('es-AR')}{' '}
              <span className="text-lg font-normal text-[#6e6e73]">productos</span>
            </p>
          </div>
        </div>

        {/* Desktop layout: packs + sticky aside */}
        <div id="packs" className="mb-14">
          <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73] mb-8">
            Elegí los módulos que necesitás
          </p>

          <div className="flex gap-8 items-start">
            {/* Packs grid */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PACKS.map(pack => {
                  const isActive = activePacks.has(pack.id as PackId)
                  const isAI = pack.id === 'ai'
                  const isFeatured = pack.is_featured || isAI

                  return (
                    <div
                      key={pack.id}
                      className={`border rounded-xl p-5 transition-all relative ${
                        isAI
                          ? 'border-violet-400 bg-gradient-to-br from-violet-50 via-white to-violet-50/30 shadow-lg shadow-violet-100'
                          : isActive
                            ? 'border-[#1b1b1b]/20 bg-[#f9f9f9]'
                            : 'border-[#e0e0e0] bg-white hover:border-[#1b1b1b]/30'
                      }`}
                    >
                      {isAI && (
                        <div className="absolute -top-3 left-4">
                          <Badge className="gap-1 text-[10px] bg-violet-600 shadow-sm">
                            <Sparkles className="h-2.5 w-2.5" />
                            El más vendido
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`text-sm font-semibold ${isAI ? 'text-violet-700' : 'text-[#1b1b1b]'}`}>
                              {pack.label}
                            </h3>
                            {isFeatured && !isAI && (
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
                            <Check className={`w-3.5 h-3.5 flex-shrink-0 ${isAI ? 'text-violet-600' : 'text-emerald-600'}`} />
                            <span className="text-[10px] text-[#6e6e73]">{m}</span>
                          </div>
                        ))}
                      </div>

                      {pack.is_paid && (
                        <div className="mb-4">
                          <p className={`text-2xl font-bold ${isAI ? 'text-violet-700' : 'text-[#1b1b1b]'}`}>
                            $10.000
                          </p>
                          <p className="text-xs text-[#6e6e73]">por mes</p>
                        </div>
                      )}

                      {pack.id === 'core' ? (
                        <p className="text-xs text-emerald-600 font-medium">✓ Siempre incluido</p>
                      ) : isAI ? (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => handlePackToggle(pack.id as PackId, checked)}
                            className="data-[state=checked]:bg-violet-600"
                            aria-label={pack.label}
                          />
                          {!isActive && (
                            <span className="text-xs text-violet-600 font-medium">Activar IA</span>
                          )}
                        </div>
                      ) : (
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => handlePackToggle(pack.id as PackId, checked)}
                          aria-label={pack.label}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bundle banner */}
              {operationalPacks && (
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                  <span className="text-emerald-600 text-lg">🎉</span>
                  <div>
                    <p className="text-sm text-emerald-800 font-medium">
                      Descuento bundle activo — ahorrás {formatARS(packPricing.bundleDiscount)}/mes
                    </p>
                    <p className="text-xs text-emerald-700">
                      Precio sin descuento: <span className="line-through">{formatARS(totalWithoutDiscount)}</span>
                      {' → '}<span className="font-bold">{formatARS(total)}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky aside — desktop only */}
            <div className="hidden lg:block w-72 shrink-0 sticky top-24 self-start">
              <div className="border border-[#e0e0e0] rounded-2xl p-6 bg-[#f9f9f9]">
                <PricingSummary
                  maxProducts={maxProducts}
                  activePacks={activePacks}
                  operationalPacks={operationalPacks}
                  baseTierPrice={baseTierPrice}
                  packPricing={packPricing}
                  total={total}
                  totalWithoutDiscount={totalWithoutDiscount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary — tablet/mobile (non-sticky, shown before FAQ) */}
        <div className="lg:hidden border border-[#e0e0e0] rounded-2xl p-6 bg-[#f9f9f9] mb-14">
          <PricingSummary
            maxProducts={maxProducts}
            activePacks={activePacks}
            operationalPacks={operationalPacks}
            baseTierPrice={baseTierPrice}
            packPricing={packPricing}
            total={total}
            totalWithoutDiscount={totalWithoutDiscount}
          />
        </div>

        {/* FAQ */}
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73] mb-6">
            Preguntas frecuentes
          </p>
          <div className="divide-y divide-[#e0e0e0] border border-[#e0e0e0] rounded-xl overflow-hidden">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}>
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-[#f9f9f9] transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium text-[#1b1b1b] pr-4">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-[#6e6e73] shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-[#6e6e73] shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-[#6e6e73] leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky bottom bar — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-[#e0e0e0] p-4 shadow-lg">
        <PricingSummary
          compact
          maxProducts={maxProducts}
          activePacks={activePacks}
          operationalPacks={operationalPacks}
          baseTierPrice={baseTierPrice}
          packPricing={packPricing}
          total={total}
          totalWithoutDiscount={totalWithoutDiscount}
        />
      </div>
    </>
  )
}
