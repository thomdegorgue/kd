'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/lib/actions/categories'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useCategories() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.categories(store_id),
    queryFn: async () => {
      const result = await listCategories()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.categories,
    gcTime: gcTimes.categories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createCategory>[0]) => {
      const result = await createCategory(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(store_id) })
      toast.success('Categoría creada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateCategory>[0]) => {
      const result = await updateCategory(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(store_id) })
      toast.success('Categoría actualizada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCategory(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(store_id) })
      toast.success('Categoría eliminada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useReorderCategories() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await reorderCategories(ids)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(store_id) })
    },
    onError: (error) => toast.error(error.message),
  })
}
