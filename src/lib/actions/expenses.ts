'use server'

import { executeAction } from './helpers'
import type { CreateExpenseInput, UpdateExpenseInput } from '@/lib/validations/expense'

export type ExpenseListResult = {
  items: Record<string, unknown>[]
  total: number
}

export type ExpenseSummary = {
  total: number
  by_category: Record<string, number>
}

export type ExpenseFilters = {
  category?: string
  date_from?: string
  date_to?: string
  page?: number
  pageSize?: number
}

export async function listExpenses(filters?: ExpenseFilters) {
  return executeAction<ExpenseListResult>('list_expenses', filters ?? {})
}

export async function getExpensesSummary(date_from?: string, date_to?: string) {
  return executeAction<ExpenseSummary>('get_expenses_summary', { date_from, date_to })
}

export async function createExpense(input: CreateExpenseInput) {
  return executeAction<Record<string, unknown>>('create_expense', input)
}

export async function updateExpense(input: UpdateExpenseInput) {
  return executeAction<Record<string, unknown>>('update_expense', input)
}

export async function deleteExpense(id: string) {
  return executeAction<{ deleted: boolean }>('delete_expense', { id })
}

export async function getExpenseCategories() {
  return executeAction<{ expense_categories: string[] }>('get_expense_categories', {})
}

export async function updateExpenseCategories(categories: string[]) {
  return executeAction<{ expense_categories: string[] }>('update_expense_categories', { categories })
}
