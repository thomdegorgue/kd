import { useCallback } from 'react'
import { formatPrice, formatPriceShort } from '@/lib/utils/currency'

/**
 * Hook que retorna formatters de moneda.
 * En el futuro puede leer currency desde store config.
 */
export function useCurrency() {
  const currency = 'ARS'

  const format = useCallback(
    (cents: number) => formatPrice(cents, currency),
    [currency],
  )

  const formatShort = useCallback(
    (cents: number) => formatPriceShort(cents),
    [],
  )

  return { formatPrice: format, formatPriceShort: formatShort, currency }
}
