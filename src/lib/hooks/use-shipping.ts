'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listShippingMethods,
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  listShipments,
  createShipment,
  updateShipmentStatus,
} from '@/lib/actions/shipping'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useShippingMethods() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.shippingMethods(store_id),
    queryFn: async () => {
      const result = await listShippingMethods()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.shippingMethods,
    gcTime: gcTimes.shippingMethods,
  })
}

export function useCreateShippingMethod() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createShippingMethod>[0]) => {
      const result = await createShippingMethod(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingMethods(store_id) })
      toast.success('Método de envío creado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateShippingMethod() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateShippingMethod>[0]) => {
      const result = await updateShippingMethod(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingMethods(store_id) })
      toast.success('Método de envío actualizado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteShippingMethod() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteShippingMethod(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shippingMethods(store_id) })
      toast.success('Método de envío eliminado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useShipments(filters?: { order_id?: string; page?: number }) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.shipments(store_id, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await listShipments(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.shipments,
    gcTime: gcTimes.shipments,
  })
}

export function useCreateShipment() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createShipment>[0]) => {
      const result = await createShipment(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments(store_id) })
      toast.success('Envío creado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateShipmentStatus>[0]) => {
      const result = await updateShipmentStatus(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shipments(store_id) })
      toast.success('Estado de envío actualizado')
    },
    onError: (error) => toast.error(error.message),
  })
}
