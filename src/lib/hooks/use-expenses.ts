'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listExpenses,
  getExpensesSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  updateExpenseCategories,
  type ExpenseFilters,
} from '@/lib/actions/expenses'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useExpenses(filters?: ExpenseFilters) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.expenses(store_id, filters as Record<string, unknown> | undefined),
    queryFn: async () => {
      const result = await listExpenses(filters)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.expenses,
    gcTime: gcTimes.expenses,
  })
}

export function useExpensesSummary(date_from?: string, date_to?: string) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.expensesSummary(store_id, date_from, date_to),
    queryFn: async () => {
      const result = await getExpensesSummary(date_from, date_to)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.expenses,
    gcTime: gcTimes.expenses,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof createExpense>[0]) => {
      const result = await createExpense(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.expensesSummary(store_id) })
      toast.success('Gasto registrado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateExpense>[0]) => {
      const result = await updateExpense(input)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.expensesSummary(store_id) })
      toast.success('Gasto actualizado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteExpense(id)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.expensesSummary(store_id) })
      toast.success('Gasto eliminado')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useExpenseCategories() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.expenseCategories(store_id),
    queryFn: async () => {
      const result = await getExpenseCategories()
      if (!result.success) throw new Error(result.error.message)
      return result.data.expense_categories
    },
    staleTime: staleTimes.expenses,
    gcTime: gcTimes.expenses,
  })
}

export function useAddExpenseCategory() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async (categories: string[]) => {
      const result = await updateExpenseCategories(categories)
      if (!result.success) throw new Error(result.error.message)
      return result.data.expense_categories
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories(store_id) })
    },
    onError: (error) => toast.error(error.message),
  })
}
