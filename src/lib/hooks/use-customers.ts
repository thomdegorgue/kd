'use client'

import { useQuery } from '@tanstack/react-query'
import { listCustomers, getCustomer, type CustomerFilters } from '@/lib/actions/customers'
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
