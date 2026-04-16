'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  PRO_MODULES,
  BASE_MODULES,
  computePriceBreakdown,
  formatARS,
} from '@/lib/billing/calculator'
import type { ModuleName } from '@/lib/types'

const PLAN_PRICING = {
  price_per_100_products: 2000000, // $20.000 ARS en centavos
  pro_module_price: 500000,        // $5.000 ARS en centavos
}

const TIERS = [100, 200, 300, 500, 1000, 2000] as const

const BASE_MODULE_LABELS: Record<string, string> = {
  catalog: 'Catálogo público',
  products: 'Gestión de productos',
  categories: 'Categorías',
  cart: 'Carrito WhatsApp',
  orders: 'Gestión de pedidos',
  stock: 'Control de stock',
  payments: 'Registro de cobros',
  banners: 'Banners promocionales',
  social: 'Redes sociales',
  product_page: 'Página de producto',
  shipping: 'Envíos y tracking',
}

const PRO_MODULE_LABELS: Record<string, string> = {
  variants: 'Variantes de producto',
  wholesale: 'Precios mayoristas',
  finance: 'Finanzas',
  expenses: 'Gastos',
  savings_account: 'Caja de ahorro',
  multiuser: 'Multi-usuario',
  custom_domain: 'Dominio propio',
  tasks: 'Tareas',
  assistant: 'Asistente IA',
}

export function PricingCalculator() {
  const [maxProducts, setMaxProducts] = useState<number>(100)
  const [activeModules, setActiveModules] = useState<Partial<Record<ModuleName, boolean>>>({})

  const breakdown = computePriceBreakdown(PLAN_PRICING, maxProducts, activeModules)

  function handleModuleToggle(module: ModuleName, checked: boolean) {
    setActiveModules(prev => ({ ...prev, [module]: checked }))
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

      {/* Modules grid */}
      <div id="modulos" className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-14">

        {/* Base modules */}
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73] mb-6">
            Incluido en todo plan
          </p>
          <ul className="space-y-3.5">
            {BASE_MODULES.map(module => (
              <li key={module} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                </span>
                <span className="text-sm text-[#1b1b1b]">
                  {BASE_MODULE_LABELS[module] ?? module}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro modules */}
        <div>
          <p className="text-xs font-medium tracking-wider uppercase text-[#6e6e73] mb-6">
            Módulos pro ·{' '}
            <span className="text-violet-600 normal-case tracking-normal">
              {formatARS(PLAN_PRICING.pro_module_price)}/mes c/u
            </span>
          </p>
          <ul className="space-y-3.5">
            {PRO_MODULES.map(module => {
              const isActive = activeModules[module] === true
              return (
                <li key={module} className="flex items-center justify-between gap-4">
                  <label
                    htmlFor={`module-${module}`}
                    className={`text-sm cursor-pointer select-none transition-colors flex-1 ${
                      isActive ? 'text-[#1b1b1b] font-medium' : 'text-[#6e6e73]'
                    }`}
                  >
                    {PRO_MODULE_LABELS[module] ?? module}
                  </label>
                  <Switch
                    id={`module-${module}`}
                    size="sm"
                    checked={isActive}
                    onCheckedChange={(checked) => handleModuleToggle(module, checked)}
                  />
                </li>
              )
            })}
          </ul>
        </div>
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
                  {formatARS(PLAN_PRICING.price_per_100_products)} × {breakdown.tiers}{' '}
                  {breakdown.tiers === 1 ? 'bloque' : 'bloques'} de 100 productos
                </span>
                <span className="text-sm font-semibold text-[#1b1b1b]">
                  = {formatARS(breakdown.basePrice)}
                </span>
              </div>
              {breakdown.activeProModules.length > 0 && (
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-sm text-[#6e6e73]">
                    {formatARS(PLAN_PRICING.pro_module_price)} ×{' '}
                    {breakdown.activeProModules.length}{' '}
                    {breakdown.activeProModules.length === 1 ? 'módulo pro' : 'módulos pro'}
                  </span>
                  <span className="text-sm font-semibold text-violet-600">
                    + {formatARS(breakdown.proPrice)}
                  </span>
                </div>
              )}
              {breakdown.activeProModules.length === 0 && (
                <p className="text-sm text-[#6e6e73]/60 italic">
                  Activá módulos pro para verlos reflejados en el total.
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
                {formatARS(breakdown.total)}
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
