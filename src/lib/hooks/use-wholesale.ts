'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listWholesalePrices, setWholesalePrice, deleteWholesalePrice } from '@/lib/actions/wholesale'
import { useAdminContext } from '@/lib/hooks/use-admin-context'

export function useWholesalePrices() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: ['wholesale', store_id],
    queryFn: async () => {
      const result = await listWholesalePrices()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useSetWholesalePrice() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof setWholesalePrice>[0]) => {
      const result = await setWholesalePrice(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale', store_id] })
      toast.success('Precio mayorista guardado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteWholesalePrice() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (product_id: string) => {
      const result = await deleteWholesalePrice(product_id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wholesale', store_id] })
      toast.success('Precio mayorista eliminado')
    },
    onError: (error) => toast.error(error.message),
  })
}
