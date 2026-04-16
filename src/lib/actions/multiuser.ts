'use server'

import { executeAction } from './helpers'
import type {
  InviteStoreUserInput,
  UpdateStoreUserRoleInput,
  RemoveStoreUserInput,
} from '@/lib/validations/multiuser'

export async function listStoreUsers() {
  return executeAction<Record<string, unknown>[]>('list_store_users', {})
}

export async function listInvitations() {
  return executeAction<Record<string, unknown>[]>('list_invitations', {})
}

export async function inviteStoreUser(input: InviteStoreUserInput) {
  return executeAction<Record<string, unknown>>('invite_store_user', input)
}

export async function cancelInvitation(id: string) {
  return executeAction<{ cancelled: boolean }>('cancel_invitation', { id })
}

export async function updateStoreUserRole(input: UpdateStoreUserRoleInput) {
  return executeAction<Record<string, unknown>>('update_store_user_role', input)
}

export async function removeStoreUser(input: RemoveStoreUserInput) {
  return executeAction<{ removed: boolean }>('remove_store_user', input)
}
