'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  type OrderFilters,
} from '@/lib/actions/orders'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useOrders(filters?: OrderFilters) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.orders(store_id, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await listOrders(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.orders,
    gcTime: gcTimes.orders,
  })
}

export function useOrder(id: string) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.order(store_id, id),
    queryFn: async () => {
      const result = await getOrder(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.orderDetail,
    gcTime: gcTimes.orderDetail,
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createOrder>[0]) => {
      const result = await createOrder(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.customers(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(store_id) })
      toast.success('Pedido creado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateOrderStatus>[0]) => {
      const result = await updateOrderStatus(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(store_id) })
      toast.success('Estado actualizado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof cancelOrder>[0]) => {
      const result = await cancelOrder(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(store_id) })
      toast.success('Pedido cancelado')
    },
    onError: (error) => toast.error(error.message),
  })
}
