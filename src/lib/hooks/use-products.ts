'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductFilters,
} from '@/lib/actions/products'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useProducts(filters?: ProductFilters) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.products(store_id, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await listProducts(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.products,
    gcTime: gcTimes.products,
  })
}

export function useProduct(id: string) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.product(store_id, id),
    queryFn: async () => {
      const result = await getProduct(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.products,
    gcTime: gcTimes.products,
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createProduct>[0]) => {
      const result = await createProduct(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(store_id) })
      toast.success('Producto creado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateProduct>[0]) => {
      const result = await updateProduct(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products(store_id) })
      toast.success('Producto actualizado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteProduct(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(store_id) })
      toast.success('Producto eliminado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
