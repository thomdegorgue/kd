import { describe, it, expect } from 'vitest'
import { COMMERCIAL_TIERS, getSuggestedMonthlyCentsForCap } from '@/lib/billing/commercial-tiers'

describe('COMMERCIAL_TIERS', () => {
  it('tiene 5 tiers', () => {
    expect(COMMERCIAL_TIERS).toHaveLength(5)
  })

  it('el primer tier es $20.000 por hasta 100 productos', () => {
    const first = COMMERCIAL_TIERS[0]
    expect(first.max_products).toBe(100)
    expect(first.price_cents).toBe(2_000_000)
  })

  it('los tiers están ordenados por max_products ascendente', () => {
    const caps = COMMERCIAL_TIERS.map((t) => t.max_products)
    expect(caps).toEqual([100, 200, 300, 500, 1000])
  })

  it('el último tier llega a 1000 productos', () => {
    expect(COMMERCIAL_TIERS[COMMERCIAL_TIERS.length - 1].max_products).toBe(1000)
    expect(COMMERCIAL_TIERS[COMMERCIAL_TIERS.length - 1].price_cents).toBe(10_000_000)
  })
})

describe('getSuggestedMonthlyCentsForCap', () => {
  it('retorna precio exacto para caps conocidos', () => {
    expect(getSuggestedMonthlyCentsForCap(100)).toBe(2_000_000)
    expect(getSuggestedMonthlyCentsForCap(200)).toBe(4_000_000)
    expect(getSuggestedMonthlyCentsForCap(300)).toBe(5_500_000)
    expect(getSuggestedMonthlyCentsForCap(500)).toBe(8_000_000)
    expect(getSuggestedMonthlyCentsForCap(1000)).toBe(10_000_000)
  })

  it('retorna el tier más cercano superior para cap intermedio', () => {
    expect(getSuggestedMonthlyCentsForCap(101)).toBe(4_000_000) // siguiente a 100 → 200
    expect(getSuggestedMonthlyCentsForCap(150)).toBe(4_000_000) // <= 200
    expect(getSuggestedMonthlyCentsForCap(201)).toBe(5_500_000) // siguiente a 200 → 300
    expect(getSuggestedMonthlyCentsForCap(450)).toBe(8_000_000) // <= 500
  })

  it('retorna el último tier para cap superior al máximo', () => {
    expect(getSuggestedMonthlyCentsForCap(1001)).toBe(10_000_000)
    expect(getSuggestedMonthlyCentsForCap(5000)).toBe(10_000_000)
  })

  it('retorna el primer tier para cap 0 o menor', () => {
    expect(getSuggestedMonthlyCentsForCap(0)).toBe(2_000_000)
    expect(getSuggestedMonthlyCentsForCap(1)).toBe(2_000_000)
  })
})
