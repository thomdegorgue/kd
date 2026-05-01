'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listPaymentMethods,
  upsertPaymentMethod,
  togglePaymentMethod,
  type PaymentMethodRow,
  type UpsertPaymentMethodInput,
} from '@/lib/actions/payment-methods'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys } from '@/lib/hooks/query-keys'

export function usePaymentMethods() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.paymentMethods(store_id),
    queryFn: async () => {
      const result = await listPaymentMethods()
      if (!result.success) throw new Error(result.error.message)
      return (result.data ?? []) as PaymentMethodRow[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

export function useUpsertPaymentMethod() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: UpsertPaymentMethodInput) => {
      const result = await upsertPaymentMethod(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data as PaymentMethodRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods(store_id) })
      toast.success('Método de pago guardado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useTogglePaymentMethod() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const result = await togglePaymentMethod(id, is_active)
      if (!result.success) throw new Error(result.error.message)
      return result.data as PaymentMethodRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods(store_id) })
    },
    onError: (error) => toast.error(error.message),
  })
}
