'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  type TaskFilters,
} from '@/lib/actions/tasks'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useTasks(filters?: TaskFilters) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.tasks(store_id, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await listTasks(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.tasks,
    gcTime: gcTimes.tasks,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createTask>[0]) => {
      const result = await createTask(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(store_id) })
      toast.success('Tarea creada')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateTask>[0]) => {
      const result = await updateTask(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(store_id) })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await completeTask(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(store_id) })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTask(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(store_id) })
      toast.success('Tarea eliminada')
    },
    onError: (error) => toast.error(error.message),
  })
}
