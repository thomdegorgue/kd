'use server'

import { executeAction } from './helpers'
import type { SetWholesalePriceInput } from '@/lib/validations/wholesale'

export type WholesaleItem = {
  id: string
  name: string
  price: number
  image_url: string | null
  wholesale_price: number | null
  min_quantity: number | null
}

export async function listWholesalePrices() {
  return executeAction<WholesaleItem[]>('list_wholesale_prices', {})
}

export async function setWholesalePrice(input: SetWholesalePriceInput) {
  return executeAction<Record<string, unknown>>('set_wholesale_price', input)
}

export async function deleteWholesalePrice(product_id: string) {
  return executeAction<{ deleted: boolean }>('delete_wholesale_price', { product_id })
}
