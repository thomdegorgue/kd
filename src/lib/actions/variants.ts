'use server'

import { executeAction } from './helpers'
import type {
  CreateVariantAttributeInput,
  CreateVariantInput,
  UpdateVariantInput,
} from '@/lib/validations/variant'

export async function listVariantAttributes(product_id: string) {
  return executeAction<Record<string, unknown>[]>('list_variant_attributes', { product_id })
}

export async function createVariantAttribute(input: CreateVariantAttributeInput) {
  return executeAction<Record<string, unknown>>('create_variant_attribute', input)
}

export async function listVariants(product_id: string) {
  return executeAction<Record<string, unknown>[]>('list_variants', { product_id })
}

export async function createVariant(input: CreateVariantInput) {
  return executeAction<Record<string, unknown>>('create_variant', input)
}

export async function updateVariant(input: UpdateVariantInput) {
  return executeAction<Record<string, unknown>>('update_variant', input)
}

export async function deleteVariant(id: string) {
  return executeAction<{ deleted: boolean }>('delete_variant', { id })
}
