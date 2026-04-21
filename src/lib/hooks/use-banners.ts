'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listBanners, createBanner, updateBanner, deleteBanner, reorderBanners } from '@/lib/actions/banners'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useBanners() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.banners(store_id),
    queryFn: async () => {
      const result = await listBanners()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.banners,
    gcTime: gcTimes.banners,
  })
}

export function useCreateBanner() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createBanner>[0]) => {
      const result = await createBanner(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banners(store_id) })
      toast.success('Banner creado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateBanner() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateBanner>[0]) => {
      const result = await updateBanner(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banners(store_id) })
      toast.success('Banner actualizado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteBanner() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteBanner(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banners(store_id) })
      toast.success('Banner eliminado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useReorderBanners() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await reorderBanners(ids)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banners(store_id) })
    },
    onError: (error) => toast.error(error.message),
  })
}
