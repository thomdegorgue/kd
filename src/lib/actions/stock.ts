'use server'

import { executeAction } from './helpers'
import type { UpdateStockInput, ListStockInput } from '@/lib/validations/stock'

export type StockItem = {
  id: string
  name: string
  image_url: string | null
  is_active: boolean
  quantity: number
  track_stock: boolean
}

export async function listStock(filters?: ListStockInput) {
  return executeAction<StockItem[]>('list_stock', filters ?? {})
}

export async function getStock(product_id: string) {
  return executeAction<Record<string, unknown>>('get_stock', { product_id })
}

export async function updateStock(input: UpdateStockInput) {
  return executeAction<Record<string, unknown>>('update_stock', input)
}
