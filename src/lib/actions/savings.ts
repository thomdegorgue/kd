'use server'

import { executeAction } from './helpers'
import type {
  CreateSavingsAccountInput,
  UpdateSavingsAccountInput,
  CreateSavingsMovementInput,
} from '@/lib/validations/savings'

export async function listSavingsAccounts() {
  return executeAction<Record<string, unknown>[]>('list_savings_accounts', {})
}

export async function createSavingsAccount(input: CreateSavingsAccountInput) {
  return executeAction<Record<string, unknown>>('create_savings_account', input)
}

export async function updateSavingsAccount(input: UpdateSavingsAccountInput) {
  return executeAction<Record<string, unknown>>('update_savings_account', input)
}

export async function listSavingsMovements(account_id: string) {
  return executeAction<Record<string, unknown>[]>('list_savings_movements', { account_id })
}

export async function createSavingsMovement(input: CreateSavingsMovementInput) {
  return executeAction<Record<string, unknown>>('create_savings_movement', input)
}
