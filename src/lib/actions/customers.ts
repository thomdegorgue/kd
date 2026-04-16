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
  return executeAction<Record<string, unknown> & { orders: Record<string, unknown>[] }>('get_customer', { id })
}
