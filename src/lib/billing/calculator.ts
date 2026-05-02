import type { ModuleName } from '@/lib/types'
import { PACKS } from '@/lib/billing/packs'

// ============================================================
// CONSTANTES — derivadas de packs.ts para mantener sincronización
// ============================================================

// PRO_MODULES: todos los módulos en packs pagos (operations, finance, team, ai)
export const PRO_MODULES: readonly ModuleName[] = [
  ...PACKS.filter(p => p.is_paid && p.id !== 'core')
    .flatMap(p => [...p.modules])
] as const

// BASE_MODULES: todos los módulos en el pack core
export const BASE_MODULES: readonly ModuleName[] = [
  ...PACKS.find(p => p.id === 'core')?.modules ?? []
] as const

export function isProModule(module: string): module is ModuleName {
  return PRO_MODULES.includes(module as ModuleName)
}

// ============================================================
// TIPOS
// ============================================================

export type PlanPricing = {
  price_per_100_products: number // en centavos ARS
  pro_module_price: number       // en centavos ARS
}

export type AnnualPlanPricing = PlanPricing & {
  annual_discount_months: number // meses que el dueño NO paga (ej: 2 → paga 10, recibe 12)
}

// ============================================================
// CALCULADORA
// ============================================================

/**
 * Calcula el total mensual en centavos ARS.
 *
 * Total = ceil(maxProducts / 100) × price_per_100_products
 *       + count(módulos_pro_activos) × pro_module_price
 */
export function computeMonthlyTotal(
  plan: PlanPricing,
  maxProducts: number,
  activeModules: Partial<Record<ModuleName, boolean>>,
): number {
  const tiers = Math.ceil(maxProducts / 100)
  const base = tiers * plan.price_per_100_products

  const proCount = PRO_MODULES.filter((m) => activeModules[m] === true).length
  const pro = proCount * plan.pro_module_price

  return base + pro
}

/**
 * Calcula el precio anual en centavos ARS.
 *
 * Total = ceil(maxProducts / 100) × price_per_100_products × (12 - annual_discount_months)
 *
 * El plan anual incluye todos los módulos pro EXCEPTO `assistant`. Los módulos
 * pro no suman al precio base (están incluidos). Ver system/billing.md.
 */
export function calculateAnnualPrice(
  plan: AnnualPlanPricing,
  maxProducts: number,
): number {
  const tiers = Math.ceil(maxProducts / 100)
  const monthsToPay = Math.max(0, 12 - plan.annual_discount_months)
  return tiers * plan.price_per_100_products * monthsToPay
}

/**
 * Módulos pro incluidos en plan anual (todos excepto `assistant`, que es add-on mensual).
 */
export const ANNUAL_INCLUDED_PRO_MODULES: readonly ModuleName[] = PRO_MODULES.filter(
  (m) => m !== 'assistant',
)

/**
 * Detalle del precio para mostrar en UI.
 */
export function computePriceBreakdown(
  plan: PlanPricing,
  maxProducts: number,
  activeModules: Partial<Record<ModuleName, boolean>>,
): {
  tiers: number
  basePrice: number
  activeProModules: ModuleName[]
  proPrice: number
  total: number
} {
  const tiers = Math.ceil(maxProducts / 100)
  const basePrice = tiers * plan.price_per_100_products
  const activeProModules = PRO_MODULES.filter((m) => activeModules[m] === true)
  const proPrice = activeProModules.length * plan.pro_module_price
  const total = basePrice + proPrice

  return { tiers, basePrice, activeProModules, proPrice, total }
}

// ============================================================
// FORMATO
// ============================================================

/** Formatea centavos ARS a string legible: $20.000 */
export function formatARS(centavos: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(centavos / 100)
}

/** Convierte centavos ARS a pesos ARS (número) para MP API */
export function centavosToARS(centavos: number): number {
  return centavos / 100
}

/** Costo base del tier self-serve en centavos ARS. $20.000/mes por hasta 100 productos. */
export function getTierBaseCost(maxProducts: number): number {
  return Math.ceil(maxProducts / 100) * 2_000_000
}
