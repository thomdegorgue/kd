'use server'

import { executeAction } from './helpers'
import type { CreateFinanceEntryInput, UpdateFinanceEntryInput } from '@/lib/validations/finance'

export type FinanceListResult = {
  items: Record<string, unknown>[]
  total: number
}

export type FinanceSummary = {
  total_income: number
  total_expense: number
  net: number
}

export type FinanceFilters = {
  type?: 'income' | 'expense'
  date_from?: string
  date_to?: string
  page?: number
  pageSize?: number
}

export async function listFinanceEntries(filters?: FinanceFilters) {
  return executeAction<FinanceListResult>('list_finance_entries', filters ?? {})
}

export async function getFinanceSummary(date_from?: string, date_to?: string) {
  return executeAction<FinanceSummary>('get_finance_summary', { date_from, date_to })
}

export async function createFinanceEntry(input: CreateFinanceEntryInput) {
  return executeAction<Record<string, unknown>>('create_finance_entry', input)
}

export async function updateFinanceEntry(input: UpdateFinanceEntryInput) {
  return executeAction<Record<string, unknown>>('update_finance_entry', input)
}

export async function deleteFinanceEntry(id: string) {
  return executeAction<{ deleted: boolean }>('delete_finance_entry', { id })
}
