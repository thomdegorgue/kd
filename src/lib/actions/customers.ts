'use server'

import { executeAction } from './helpers'

export type CustomerFilters = {
  page?: number
  pageSize?: number
  search?: string
}

export type CustomerListResult = {
  items: Record<string, unknown>[]
  total: number
}

export async function listCustomers(filters?: CustomerFilters) {
  return executeAction<CustomerListResult>('list_customers', filters ?? {})
}

export async function getCustomer(id: string) {
  return executeAction<Record<string, unknown> & { orders: Record<string, unknown>[]; savings_account: Record<string, unknown> | null }>('get_customer', { id })
}

export async function updateCustomer(input: { id: string; notes?: string | null }) {
  return executeAction<Record<string, unknown>>('update_customer', input)
}

export async function createCustomer(input: { name: string; phone?: string }) {
  return executeAction<Record<string, unknown>>('create_customer', input)
}
