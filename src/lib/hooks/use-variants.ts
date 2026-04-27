'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listVariantAttributes,
  createVariantAttribute,
  listVariants,
  createVariant,
  updateVariant,
  deleteVariant,
} from '@/lib/actions/variants'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useVariantAttributes(product_id: string) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.variantAttributes(store_id, product_id),
    queryFn: async () => {
      const result = await listVariantAttributes(product_id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.variantAttributes,
    gcTime: gcTimes.variantAttributes,
    enabled: !!product_id,
  })
}

export function useCreateVariantAttribute() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createVariantAttribute>[0]) => {
      const result = await createVariantAttribute(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variantAttributes(store_id, input.product_id) })
      toast.success('Atributo creado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useVariants(product_id: string) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.variants(store_id, product_id),
    queryFn: async () => {
      const result = await listVariants(product_id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.variants,
    gcTime: gcTimes.variants,
    enabled: !!product_id,
  })
}

export function useCreateVariant() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createVariant>[0]) => {
      const result = await createVariant(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(store_id, input.product_id) })
      toast.success('Variante creada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateVariant(product_id: string) {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateVariant>[0]) => {
      const result = await updateVariant(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(store_id, product_id) })
      toast.success('Variante actualizada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteVariant(product_id: string) {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteVariant(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.variants(store_id, product_id) })
      toast.success('Variante eliminada')
    },
    onError: (error) => toast.error(error.message),
  })
}
