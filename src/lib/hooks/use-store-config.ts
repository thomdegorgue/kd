'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStore, updateStore, updateStoreConfig } from '@/lib/actions/store'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useStoreConfig() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.storeConfig(store_id),
    queryFn: async () => {
      const result = await getStore()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.storeConfig,
    gcTime: gcTimes.storeConfig,
  })
}

export function useUpdateStore() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: updateStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storeConfig(store_id) })
      toast.success('Tienda actualizada')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateStoreConfig() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: updateStoreConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storeConfig(store_id) })
      toast.success('Configuración actualizada')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
