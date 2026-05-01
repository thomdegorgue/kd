const ARS_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const ARS_FORMATTER_SHORT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Formatea centavos a moneda legible.
 * @example formatPrice(150000) → "$1.500,00"
 */
export function formatPrice(cents: number): string {
  return ARS_FORMATTER.format(cents / 100)
}

/**
 * Formatea centavos a moneda sin decimales.
 * @example formatPriceShort(150000) → "$1.500"
 */
export function formatPriceShort(cents: number): string {
  return ARS_FORMATTER_SHORT.format(cents / 100)
}
