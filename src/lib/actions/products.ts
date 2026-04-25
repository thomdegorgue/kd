'use server'

import { executeAction } from './helpers'
import type { CreateProductInput, UpdateProductInput, UpdateProductPageInput } from '@/lib/validations/product'

export type ProductListResult = {
  items: Record<string, unknown>[]
  total: number
}

export type ProductFilters = {
  page?: number
  pageSize?: number
  search?: string
  is_active?: boolean
}

export async function listProducts(filters?: ProductFilters) {
  return executeAction<ProductListResult>('list_products', filters ?? {})
}

export async function getProduct(id: string) {
  return executeAction<Record<string, unknown> & { category_ids: string[] }>('get_product', { id })
}

export async function createProduct(input: CreateProductInput) {
  return executeAction<Record<string, unknown>>('create_product', input)
}

export async function updateProduct(input: UpdateProductInput) {
  return executeAction<Record<string, unknown>>('update_product', input)
}

export async function deleteProduct(id: string) {
  return executeAction<{ deleted: boolean }>('delete_product', { id })
}

export async function reorderProducts(ids: string[]) {
  return executeAction<{ updated: boolean }>('reorder_products', { ids })
}

export async function updateProductPage(input: UpdateProductPageInput) {
  return executeAction<{ id: string; metadata: Record<string, unknown> }>('update_product_page', input)
}
