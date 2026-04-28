'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  getActivePlan,
  createSubscription,
  cancelSubscription,
  changeTier,
  createAnnualSubscription,
  togglePack,
} from '@/lib/actions/billing'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useBilling() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.billing(store_id),
    queryFn: async () => {
      const result = await getActivePlan()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.billing,
    gcTime: gcTimes.billing,
  })
}

export function useCreateSubscription() {
  const { store_id } = useAdminContext()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (input: unknown) => createSubscription(input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.billing(store_id) })
      toast.success('Suscripción creada. Redirigiendo a Mercado Pago...')
      router.push(result.data.init_point)
    },
    onError: () => {
      toast.error('Error al crear la suscripción')
    },
  })
}

export function useCancelSubscription() {
  const { store_id } = useAdminContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: unknown) => cancelSubscription(input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.billing(store_id) })
      toast.success('Suscripción cancelada. Tu acceso continúa hasta el fin del período.')
    },
    onError: () => {
      toast.error('Error al cancelar la suscripción')
    },
  })
}

export function useCreateAnnualSubscription() {
  const { store_id } = useAdminContext()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (tier: number) => createAnnualSubscription(tier),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.billing(store_id) })
      toast.success('Redirigiendo a Mercado Pago para completar el pago anual...')
      router.push(result.data.init_point)
    },
    onError: () => {
      toast.error('Error al crear el plan anual')
    },
  })
}

export function useChangeTier() {
  const { store_id } = useAdminContext()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (input: unknown) => changeTier(input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.billing(store_id) })
      toast.success('Tier actualizado. Redirigiendo a Mercado Pago para confirmar...')
      router.push(result.data.init_point)
    },
    onError: () => {
      toast.error('Error al cambiar el tier')
    },
  })
}

export function useTogglePack() {
  const { store_id } = useAdminContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: unknown) => togglePack(input),
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error.message)
        return
      }
      const action = result.data.enabled ? 'activado' : 'desactivado'
      toast.success(`Pack ${action} correctamente`)
      queryClient.invalidateQueries({ queryKey: queryKeys.billing(store_id) })
    },
    onError: () => {
      toast.error('Error al cambiar el pack')
    },
  })
}
