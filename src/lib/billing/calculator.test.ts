import { describe, it, expect } from 'vitest'
import {
  computeMonthlyTotal,
  calculateAnnualPrice,
  computePriceBreakdown,
  getTierBaseCost,
  formatARS,
  centavosToARS,
} from '@/lib/billing/calculator'
import type { PlanPricing, AnnualPlanPricing } from '@/lib/billing/calculator'

const PLAN: PlanPricing = {
  price_per_100_products: 2_000_000,
  pro_module_price: 1_000_000,
}

const ANNUAL_PLAN: AnnualPlanPricing = {
  ...PLAN,
  annual_discount_months: 2,
}

// ── getTierBaseCost ──────────────────────────────────────────────

describe('getTierBaseCost', () => {
  it('100 productos = $20.000 (2.000.000 centavos)', () => {
    expect(getTierBaseCost(100)).toBe(2_000_000)
  })

  it('200 productos = $40.000', () => {
    expect(getTierBaseCost(200)).toBe(4_000_000)
  })

  it('101 productos escala al siguiente tier', () => {
    expect(getTierBaseCost(101)).toBe(4_000_000)
  })

  it('1 producto = tier mínimo', () => {
    expect(getTierBaseCost(1)).toBe(2_000_000)
  })

  it('500 productos = $100.000', () => {
    expect(getTierBaseCost(500)).toBe(10_000_000)
  })
})

// ── computeMonthlyTotal ──────────────────────────────────────────

describe('computeMonthlyTotal', () => {
  it('sin módulos pro activos cobra solo la base', () => {
    const total = computeMonthlyTotal(PLAN, 100, {})
    expect(total).toBe(2_000_000)
  })

  it('módulo pro activo suma pro_module_price', () => {
    const total = computeMonthlyTotal(PLAN, 100, { stock: true })
    expect(total).toBe(3_000_000) // 2M base + 1M pro
  })

  it('múltiples módulos pro suman por módulo', () => {
    const total = computeMonthlyTotal(PLAN, 100, { stock: true, assistant: true })
    expect(total).toBe(4_000_000) // 2M + 2×1M
  })

  it('módulos core activos no suman precio pro', () => {
    // catalog, products, categories, orders son módulos core (no pagos)
    const total = computeMonthlyTotal(PLAN, 100, { catalog: true, products: true, orders: true })
    expect(total).toBe(2_000_000)
  })

  it('módulo pro false no suma', () => {
    const total = computeMonthlyTotal(PLAN, 100, { stock: false })
    expect(total).toBe(2_000_000)
  })
})

// ── calculateAnnualPrice ─────────────────────────────────────────

describe('calculateAnnualPrice', () => {
  it('descuenta los meses indicados (2 meses gratis → paga 10)', () => {
    const price = calculateAnnualPrice(ANNUAL_PLAN, 100)
    expect(price).toBe(2_000_000 * 10) // 10 meses × $20.000
  })

  it('con 0 meses de descuento paga 12', () => {
    const plan = { ...PLAN, annual_discount_months: 0 }
    expect(calculateAnnualPrice(plan, 100)).toBe(2_000_000 * 12)
  })

  it('con descuento total (12 meses) retorna 0', () => {
    const plan = { ...PLAN, annual_discount_months: 12 }
    expect(calculateAnnualPrice(plan, 100)).toBe(0)
  })

  it('con más de 12 meses de descuento retorna 0 (no negativo)', () => {
    const plan = { ...PLAN, annual_discount_months: 15 }
    expect(calculateAnnualPrice(plan, 100)).toBe(0)
  })

  it('escala por tiers de 100 productos', () => {
    const price = calculateAnnualPrice(ANNUAL_PLAN, 200)
    expect(price).toBe(2 * 2_000_000 * 10) // 2 tiers × 10 meses
  })
})

// ── computePriceBreakdown ────────────────────────────────────────

describe('computePriceBreakdown', () => {
  it('retorna los campos correctos sin módulos pro', () => {
    const b = computePriceBreakdown(PLAN, 100, {})
    expect(b.tiers).toBe(1)
    expect(b.basePrice).toBe(2_000_000)
    expect(b.activeProModules).toHaveLength(0)
    expect(b.proPrice).toBe(0)
    expect(b.total).toBe(2_000_000)
  })

  it('incluye módulos pro activos en el detalle', () => {
    const b = computePriceBreakdown(PLAN, 100, { stock: true, assistant: true })
    expect(b.activeProModules).toContain('stock')
    expect(b.activeProModules).toContain('assistant')
    expect(b.proPrice).toBe(2_000_000)
    expect(b.total).toBe(4_000_000)
  })
})

// ── formatARS ────────────────────────────────────────────────────

describe('formatARS', () => {
  it('retorna un string con el valor en pesos', () => {
    const result = formatARS(2_000_000)
    expect(typeof result).toBe('string')
    expect(result).toContain('20')
  })

  it('formatea 0', () => {
    const result = formatARS(0)
    expect(result).toContain('0')
  })
})

// ── centavosToARS ────────────────────────────────────────────────

describe('centavosToARS', () => {
  it('divide centavos por 100', () => {
    expect(centavosToARS(2_000_000)).toBe(20_000)
    expect(centavosToARS(100)).toBe(1)
    expect(centavosToARS(0)).toBe(0)
  })
})
