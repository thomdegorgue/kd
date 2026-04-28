import type { ModuleName } from '@/lib/types'

export type PackId = 'core' | 'operations' | 'finance' | 'team' | 'ai'

export type Pack = {
  id: PackId
  label: string
  description: string
  modules: readonly ModuleName[]
  price_cents: number // 0 para core
  is_paid: boolean
  is_featured: boolean // true solo para 'ai'
  cta?: string
}

export const PACKS: readonly Pack[] = [
  {
    id: 'core',
    label: 'Core',
    description: 'Tu tienda online: catálogo, carrito, pedidos, banners, redes y dominio propio. Incluido siempre.',
    modules: ['catalog', 'products', 'categories', 'cart', 'orders', 'banners', 'social', 'product_page', 'custom_domain'],
    price_cents: 0,
    is_paid: false,
    is_featured: false,
  },
  {
    id: 'operations',
    label: 'Operaciones Pro',
    description: 'Stock, envíos con tracking, variantes (talles/colores) y registro de pagos.',
    modules: ['stock', 'shipping', 'variants', 'payments'],
    price_cents: 1_000_000, // $10.000
    is_paid: true,
    is_featured: false,
  },
  {
    id: 'finance',
    label: 'Finanzas Pro',
    description: 'Flujo de caja, gastos detallados y cuentas de ahorro virtuales.',
    modules: ['finance', 'expenses', 'savings_account'],
    price_cents: 1_000_000,
    is_paid: true,
    is_featured: false,
  },
  {
    id: 'team',
    label: 'Equipo Pro',
    description: 'Multi-usuario, asignación de tareas y precios mayoristas.',
    modules: ['multiuser', 'tasks', 'wholesale'],
    price_cents: 1_000_000,
    is_paid: true,
    is_featured: false,
  },
  {
    id: 'ai',
    label: 'Asistente IA',
    description: 'Tu copiloto con acceso a productos, pedidos y finanzas. Responde, ejecuta, automatiza.',
    modules: ['assistant'],
    price_cents: 1_000_000,
    is_paid: true,
    is_featured: true,
    cta: 'El más vendido',
  },
] as const

export const PAID_PACKS = PACKS.filter(p => p.is_paid)
export const OPERATIONAL_PACK_IDS: PackId[] = ['operations', 'finance', 'team']

export function getPack(id: PackId): Pack {
  const p = PACKS.find(p => p.id === id)
  if (!p) throw new Error(`Pack inexistente: ${id}`)
  return p
}

export function getPackByModule(module: ModuleName): Pack | undefined {
  return PACKS.find(p => p.modules.includes(module))
}

export function isModuleInActivePack(
  module: ModuleName,
  activePackIds: PackId[],
): boolean {
  return activePackIds.some(id => getPack(id).modules.includes(module))
}

/**
 * Calcula precio total de packs activos (sin tier base).
 * Aplica descuento si están los 3 packs operacionales activos.
 */
export function computePackTotal(
  activePackIds: PackId[],
  bundle3PacksPrice: number = 2_500_000, // $25.000 default
): { subtotal: number; bundleDiscount: number; total: number; aiAddon: number } {
  const paidActive = activePackIds.filter(id => getPack(id).is_paid)
  const subtotal = paidActive.reduce((acc, id) => acc + getPack(id).price_cents, 0)

  const has3Operational = OPERATIONAL_PACK_IDS.every(id => paidActive.includes(id))
  const ops3Subtotal = OPERATIONAL_PACK_IDS.reduce((acc, id) => acc + getPack(id).price_cents, 0)
  const bundleDiscount = has3Operational ? Math.max(0, ops3Subtotal - bundle3PacksPrice) : 0

  const aiAddon = paidActive.includes('ai') ? getPack('ai').price_cents : 0

  return {
    subtotal,
    bundleDiscount,
    total: subtotal - bundleDiscount,
    aiAddon,
  }
}

/**
 * Convierte PackId[] a modules JSONB (backwards compatibility).
 */
export function packsToModules(packIds: PackId[]): Record<ModuleName, boolean> {
  const result: Record<string, boolean> = {}
  const allPacks = packIds.map(id => getPack(id))
  for (const pack of allPacks) {
    for (const module of pack.modules) {
      result[module] = true
    }
  }
  return result as Record<ModuleName, boolean>
}

/**
 * Convierte modules JSONB a PackId[] (detect qué packs están activos).
 * Si no todos los módulos de un pack están presentes, el pack está OFF.
 */
export function modulesToPacks(modules: Record<ModuleName, boolean>): PackId[] {
  const result: PackId[] = []
  for (const pack of PACKS) {
    const allModulesPresent = pack.modules.every(m => modules[m] === true)
    if (allModulesPresent) {
      result.push(pack.id)
    }
  }
  return result
}
