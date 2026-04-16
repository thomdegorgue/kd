'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getCustomDomainStatus,
  setCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
} from '@/lib/actions/custom-domain'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys } from '@/lib/hooks/query-keys'

export function useCustomDomain() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: ['custom-domain', store_id],
    queryFn: async () => {
      const result = await getCustomDomainStatus()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useSetCustomDomain() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof setCustomDomain>[0]) => {
      const result = await setCustomDomain(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-domain', store_id] })
      queryClient.invalidateQueries({ queryKey: queryKeys.storeConfig(store_id) })
      toast.success('Dominio guardado. Configurá el registro TXT para verificarlo.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useVerifyCustomDomain() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async () => {
      const result = await verifyCustomDomain()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['custom-domain', store_id] })
      if (data?.verified) {
        toast.success(data.message)
      } else {
        toast.error(data?.message ?? 'No se pudo verificar el dominio')
      }
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useRemoveCustomDomain() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async () => {
      const result = await removeCustomDomain()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-domain', store_id] })
      queryClient.invalidateQueries({ queryKey: queryKeys.storeConfig(store_id) })
      toast.success('Dominio personalizado eliminado')
    },
    onError: (error) => toast.error(error.message),
  })
}
