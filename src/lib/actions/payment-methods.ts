'use server'

import { executeAction } from './helpers'

export type PaymentMethodRow = {
  id: string
  store_id: string
  type: 'transfer' | 'mp'
  name: string
  instructions: string | null
  config: Record<string, unknown>
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type UpsertPaymentMethodInput = {
  type: 'transfer' | 'mp'
  name?: string
  config?: Record<string, unknown>
  instructions?: string | null
}

export async function listPaymentMethods() {
  return executeAction<PaymentMethodRow[]>('list_payment_methods', {})
}

export async function upsertPaymentMethod(input: UpsertPaymentMethodInput) {
  return executeAction<PaymentMethodRow>('upsert_payment_method', input)
}

export async function togglePaymentMethod(id: string, is_active: boolean) {
  return executeAction<PaymentMethodRow>('toggle_payment_method', { id, is_active })
}

export async function deletePaymentMethod(id: string) {
  return executeAction<{ id: string }>('delete_payment_method', { id })
}
