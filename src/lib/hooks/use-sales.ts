'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createSale,
  getDailySalesSummary,
  getSalesHistory,
  type SalesHistoryFilters,
} from '@/lib/actions/sales'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

/**
 * Mutation: crear una venta desde el POS.
 * Invalida orders, products (stock), dashboard, savings, sales-*.
 */
export function useCreateSale() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createSale>[0]) => {
      const result = await createSale(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.products(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.stock(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.savings(store_id) })
      queryClient.invalidateQueries({ queryKey: ['sales-summary', store_id] })
      queryClient.invalidateQueries({ queryKey: ['sales-history', store_id] })
      toast.success('Venta registrada')
    },
    onError: (error) => toast.error(error.message),
  })
}

/**
 * Resumen del día (default = hoy). Se usa en POS panel lateral / cierre de caja.
 */
export function useDailySalesSummary(isoDate?: string) {
  const { store_id } = useAdminContext()
  const date = isoDate ?? new Date().toISOString().slice(0, 10)

  return useQuery({
    queryKey: queryKeys.salesSummary(store_id, date),
    queryFn: () => getDailySalesSummary(isoDate),
    staleTime: staleTimes.salesSummary,
    gcTime: gcTimes.salesSummary,
  })
}

/**
 * Historial paginado de ventas admin (source='admin').
 */
export function useSalesHistory(filters: SalesHistoryFilters = {}) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.salesHistory(store_id, filters as Record<string, unknown>),
    queryFn: () => getSalesHistory(filters),
    staleTime: staleTimes.salesHistory,
    gcTime: gcTimes.salesHistory,
  })
}
