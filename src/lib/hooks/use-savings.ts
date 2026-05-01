'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listSavingsAccounts,
  createSavingsAccount,
  updateSavingsAccount,
  listSavingsMovements,
  createSavingsMovement,
} from '@/lib/actions/savings'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useSavingsAccounts() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.savings(store_id),
    queryFn: async () => {
      const result = await listSavingsAccounts()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.savings,
    gcTime: gcTimes.savings,
  })
}

export function useSavingsMovements(account_id: string | undefined) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: ['savings-movements', store_id, account_id],
    queryFn: async () => {
      const result = await listSavingsMovements(account_id!)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    enabled: !!account_id,
    staleTime: staleTimes.savings,
    gcTime: gcTimes.savings,
  })
}

export function useCreateSavingsAccount() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createSavingsAccount>[0]) => {
      const result = await createSavingsAccount(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savings(store_id) })
      toast.success('Cuenta de ahorro creada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateSavingsAccount() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateSavingsAccount>[0]) => {
      const result = await updateSavingsAccount(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savings(store_id) })
      toast.success('Cuenta actualizada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useCreateSavingsMovement() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createSavingsMovement>[0]) => {
      const result = await createSavingsMovement(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savings(store_id) })
      queryClient.invalidateQueries({ queryKey: ['savings-movements', store_id, input.account_id] })
      toast.success('Movimiento registrado')
    },
    onError: (error) => toast.error(error.message),
  })
}
