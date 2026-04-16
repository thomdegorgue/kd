'use server'

import { executeAction } from './helpers'
import type { CreatePaymentInput, UpdatePaymentStatusInput } from '@/lib/validations/payment'

export type PaymentListResult = {
  items: Record<string, unknown>[]
  total: number
}

export type PaymentFilters = {
  order_id?: string
  page?: number
  pageSize?: number
}

export async function listPayments(filters?: PaymentFilters) {
  return executeAction<PaymentListResult>('list_payments', filters ?? {})
}

export async function getPayment(id: string) {
  return executeAction<Record<string, unknown>>('get_payment', { id })
}

export async function createPayment(input: CreatePaymentInput) {
  return executeAction<Record<string, unknown>>('create_payment', input)
}

export async function updatePaymentStatus(input: UpdatePaymentStatusInput) {
  return executeAction<Record<string, unknown>>('update_payment_status', input)
}
