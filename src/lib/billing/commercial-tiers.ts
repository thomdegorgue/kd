export type CommercialTier = { max_products: number; price_cents: number }

export const COMMERCIAL_TIERS: readonly CommercialTier[] = [
  { max_products: 100,  price_cents: 2_000_000 },
  { max_products: 200,  price_cents: 4_000_000 },
  { max_products: 300,  price_cents: 5_500_000 },
  { max_products: 500,  price_cents: 8_000_000 },
  { max_products: 1000, price_cents: 10_000_000 },
] as const

/** Precio mensual sugerido para un cupo negociado (UI / cotización). Solo referencia comercial. */
export function getSuggestedMonthlyCentsForCap(maxProducts: number): number {
  const row = COMMERCIAL_TIERS.find(t => t.max_products === maxProducts)
    ?? COMMERCIAL_TIERS.find(t => maxProducts <= t.max_products)
  return row?.price_cents ?? COMMERCIAL_TIERS[COMMERCIAL_TIERS.length - 1].price_cents
}
