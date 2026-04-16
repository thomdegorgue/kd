'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listFinanceEntries,
  getFinanceSummary,
  createFinanceEntry,
  updateFinanceEntry,
  deleteFinanceEntry,
  type FinanceFilters,
} from '@/lib/actions/finance'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useFinanceEntries(filters?: FinanceFilters) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.financeEntries(store_id, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await listFinanceEntries(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.financeEntries,
    gcTime: gcTimes.financeEntries,
  })
}

export function useFinanceSummary(date_from?: string, date_to?: string) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: ['finance-summary', store_id, date_from, date_to],
    queryFn: async () => {
      const result = await getFinanceSummary(date_from, date_to)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.financeEntries,
    gcTime: gcTimes.financeEntries,
  })
}

export function useCreateFinanceEntry() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createFinanceEntry>[0]) => {
      const result = await createFinanceEntry(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financeEntries(store_id) })
      queryClient.invalidateQueries({ queryKey: ['finance-summary', store_id] })
      toast.success('Entrada creada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateFinanceEntry() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateFinanceEntry>[0]) => {
      const result = await updateFinanceEntry(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financeEntries(store_id) })
      queryClient.invalidateQueries({ queryKey: ['finance-summary', store_id] })
      toast.success('Entrada actualizada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteFinanceEntry() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteFinanceEntry(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financeEntries(store_id) })
      queryClient.invalidateQueries({ queryKey: ['finance-summary', store_id] })
      toast.success('Entrada eliminada')
    },
    onError: (error) => toast.error(error.message),
  })
}
