import { z } from 'zod'

export const inviteStoreUserSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'collaborator']),
})

export type InviteStoreUserInput = z.infer<typeof inviteStoreUserSchema>

export const updateStoreUserRoleSchema = z.object({
  user_id: z.string().uuid('user_id inválido'),
  role: z.enum(['admin', 'collaborator']),
})

export type UpdateStoreUserRoleInput = z.infer<typeof updateStoreUserRoleSchema>

export const removeStoreUserSchema = z.object({
  user_id: z.string().uuid('user_id inválido'),
})

export type RemoveStoreUserInput = z.infer<typeof removeStoreUserSchema>

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  collaborator: 'Colaborador',
}
