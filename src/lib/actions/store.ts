'use server'

import { executeAction } from './helpers'
import type { Store } from '@/lib/types'
import type { UpdateStoreInput } from '@/lib/validations/store'

export async function getStore() {
  return executeAction<Store>('get_store')
}

export async function updateStore(input: UpdateStoreInput) {
  return executeAction<Store>('update_store', input)
}

export async function updateStoreConfig(input: Record<string, unknown>) {
  return executeAction<Store>('update_store_config', input)
}
