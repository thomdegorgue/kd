'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listStock, updateStock, type StockItem } from '@/lib/actions/stock'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useStock(filters?: { low_stock_only?: boolean; low_stock_threshold?: number }) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: [...queryKeys.stock(store_id), filters ?? {}],
    queryFn: async () => {
      const result = await listStock(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data as StockItem[]
    },
    staleTime: staleTimes.stock,
    gcTime: gcTimes.stock,
  })
}

export function useUpdateStock() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateStock>[0]) => {
      const result = await updateStock(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stock(store_id) })
      toast.success('Stock actualizado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
