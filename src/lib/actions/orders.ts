'use server'

import { executeAction } from './helpers'
import type { CreateOrderInput, UpdateOrderStatusInput, CancelOrderInput } from '@/lib/validations/order'

export type OrderFilters = {
  page?: number
  pageSize?: number
  status?: string
  date_from?: string
  date_to?: string
}

export type OrderListResult = {
  items: Record<string, unknown>[]
  total: number
}

export async function listOrders(filters?: OrderFilters) {
  return executeAction<OrderListResult>('list_orders', filters ?? {})
}

export async function getOrder(id: string) {
  return executeAction<Record<string, unknown> & { items: Record<string, unknown>[] }>('get_order', { id })
}

export async function createOrder(input: CreateOrderInput) {
  return executeAction<Record<string, unknown>>('create_order', input)
}

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  return executeAction<Record<string, unknown>>('update_order_status', input)
}

export async function cancelOrder(input: CancelOrderInput) {
  return executeAction<Record<string, unknown>>('cancel_order', input)
}
