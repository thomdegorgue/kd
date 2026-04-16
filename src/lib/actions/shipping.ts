'use server'

import { executeAction } from './helpers'
import type {
  CreateShippingMethodInput,
  UpdateShippingMethodInput,
  CreateShipmentInput,
  UpdateShipmentStatusInput,
} from '@/lib/validations/shipping'

export type ShipmentListResult = {
  items: Record<string, unknown>[]
  total: number
}

export async function listShippingMethods() {
  return executeAction<Record<string, unknown>[]>('list_shipping_methods', {})
}

export async function createShippingMethod(input: CreateShippingMethodInput) {
  return executeAction<Record<string, unknown>>('create_shipping_method', input)
}

export async function updateShippingMethod(input: UpdateShippingMethodInput) {
  return executeAction<Record<string, unknown>>('update_shipping_method', input)
}

export async function deleteShippingMethod(id: string) {
  return executeAction<{ deleted: boolean }>('delete_shipping_method', { id })
}

export async function listShipments(filters?: { order_id?: string; page?: number; pageSize?: number }) {
  return executeAction<ShipmentListResult>('list_shipments', filters ?? {})
}

export async function createShipment(input: CreateShipmentInput) {
  return executeAction<Record<string, unknown>>('create_shipment', input)
}

export async function updateShipmentStatus(input: UpdateShipmentStatusInput) {
  return executeAction<Record<string, unknown>>('update_shipment_status', input)
}
