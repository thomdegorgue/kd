'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listPayments,
  createPayment,
  updatePaymentStatus,
  type PaymentFilters,
} from '@/lib/actions/payments'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function usePayments(filters?: PaymentFilters) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.payments(store_id, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await listPayments(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.payments,
    gcTime: gcTimes.payments,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createPayment>[0]) => {
      const result = await createPayment(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(store_id) })
      toast.success('Pago registrado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updatePaymentStatus>[0]) => {
      const result = await updatePaymentStatus(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(store_id) })
      toast.success('Estado de pago actualizado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
