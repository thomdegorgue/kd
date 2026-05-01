import { describe, it, expect } from 'vitest'
import { computePackTotal } from '@/lib/billing/packs'

describe('computePackTotal', () => {
  it('cobra 0 si no hay packs pagos', () => {
    const r = computePackTotal(['core'])
    expect(r.subtotal).toBe(0)
    expect(r.bundleDiscount).toBe(0)
    expect(r.total).toBe(0)
  })

  it('suma packs pagos individuales', () => {
    const r = computePackTotal(['operations', 'ai'])
    expect(r.subtotal).toBe(2_000_000)
    expect(r.bundleDiscount).toBe(0)
    expect(r.total).toBe(2_000_000)
  })

  it('aplica descuento bundle si están los 3 operacionales', () => {
    const r = computePackTotal(['operations', 'finance', 'team'])
    expect(r.subtotal).toBe(3_000_000)
    expect(r.bundleDiscount).toBe(500_000)
    expect(r.total).toBe(2_500_000)
  })

  it('no descuenta por IA (solo bundle operacional)', () => {
    const r = computePackTotal(['operations', 'finance', 'team', 'ai'])
    expect(r.subtotal).toBe(4_000_000)
    expect(r.bundleDiscount).toBe(500_000)
    expect(r.total).toBe(3_500_000)
  })
})

