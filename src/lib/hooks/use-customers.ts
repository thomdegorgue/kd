'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listCustomers, getCustomer, updateCustomer, createCustomer, type CustomerFilters } from '@/lib/actions/customers'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useCustomers(filters?: CustomerFilters) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.customers(store_id, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await listCustomers(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.customers,
    gcTime: gcTimes.customers,
  })
}

export function useCustomer(id: string) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.customer(store_id, id),
    queryFn: async () => {
      const result = await getCustomer(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.customers,
    gcTime: gcTimes.customers,
    enabled: !!id,
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateCustomer>[0]) => {
      const result = await updateCustomer(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.customer(store_id, input.id) })
      toast.success('Cliente actualizado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: { name: string; phone?: string }) => {
      const result = await createCustomer(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data as { id: string; name: string; phone: string | null }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers(store_id) })
    },
    onError: (error) => toast.error(error.message),
  })
}
