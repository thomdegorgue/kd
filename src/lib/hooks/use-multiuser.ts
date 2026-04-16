'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listStoreUsers,
  listInvitations,
  inviteStoreUser,
  cancelInvitation,
  updateStoreUserRole,
  removeStoreUser,
} from '@/lib/actions/multiuser'
import { useAdminContext } from '@/lib/hooks/use-admin-context'

export function useStoreUsers() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: ['store-users', store_id],
    queryFn: async () => {
      const result = await listStoreUsers()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useInvitations() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: ['invitations', store_id],
    queryFn: async () => {
      const result = await listInvitations()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useInviteStoreUser() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof inviteStoreUser>[0]) => {
      const result = await inviteStoreUser(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', store_id] })
      toast.success('Invitación enviada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useCancelInvitation() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await cancelInvitation(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', store_id] })
      toast.success('Invitación cancelada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateStoreUserRole() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateStoreUserRole>[0]) => {
      const result = await updateStoreUserRole(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-users', store_id] })
      toast.success('Rol actualizado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useRemoveStoreUser() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (user_id: string) => {
      const result = await removeStoreUser({ user_id })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-users', store_id] })
      toast.success('Usuario removido')
    },
    onError: (error) => toast.error(error.message),
  })
}
