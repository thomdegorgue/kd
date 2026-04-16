'use server'

import { executeAction } from './helpers'
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/validations/category'

export type CategoryWithCount = Record<string, unknown> & { product_count: number }

export async function listCategories() {
  return executeAction<CategoryWithCount[]>('list_categories')
}

export async function createCategory(input: CreateCategoryInput) {
  return executeAction<Record<string, unknown>>('create_category', input)
}

export async function updateCategory(input: UpdateCategoryInput) {
  return executeAction<Record<string, unknown>>('update_category', input)
}

export async function deleteCategory(id: string) {
  return executeAction<{ deleted: boolean }>('delete_category', { id })
}

export async function reorderCategories(ids: string[]) {
  return executeAction<{ updated: boolean }>('reorder_categories', { ids })
}

export async function assignProductCategory(productId: string, categoryId: string) {
  return executeAction<{ assigned: boolean }>('assign_product_category', {
    product_id: productId,
    category_id: categoryId,
  })
}

export async function removeProductCategory(productId: string, categoryId: string) {
  return executeAction<{ removed: boolean }>('remove_product_category', {
    product_id: productId,
    category_id: categoryId,
  })
}
