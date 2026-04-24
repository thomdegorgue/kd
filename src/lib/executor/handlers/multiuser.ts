import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import {
  inviteStoreUserSchema,
  updateStoreUserRoleSchema,
  removeStoreUserSchema,
} from '@/lib/validations/multiuser'
import { sendEmail } from '@/lib/email/resend'
import { InvitationEmail } from '@/lib/email/templates/invitation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ── list_store_users ─────────────────────────────────────────

registerHandler({
  name: 'list_store_users',
  requires: ['multiuser'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data, error } = await db
      .from('store_users')
      .select('user_id, role, created_at')
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    // Fetch user emails from auth.users via service role
    const userIds = (data as { user_id: string }[]).map((u) => u.user_id)
    if (userIds.length === 0) return []

    const { data: users, error: uErr } = await db
      .from('users')
      .select('id, email')
      .in('id', userIds)

    if (uErr) throw new Error(uErr.message)

    const userMap = new Map<string, string>(
      (users as { id: string; email: string }[]).map((u) => [u.id, u.email])
    )

    return (data as { user_id: string; role: string; created_at: string }[]).map((su) => ({
      ...su,
      email: userMap.get(su.user_id) ?? '—',
    }))
  },
})

// ── list_invitations ─────────────────────────────────────────

registerHandler({
  name: 'list_invitations',
  requires: ['multiuser'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const now = new Date().toISOString()

    const { data, error } = await db
      .from('store_invitations')
      .select('*')
      .eq('store_id', context.store_id)
      .is('accepted_at', null)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  },
})

// ── invite_store_user ────────────────────────────────────────

registerHandler({
  name: 'invite_store_user',
  requires: ['multiuser'],
  permissions: ['owner', 'admin'],
  event_type: 'user_invited',
  invalidates: ['invitations:{store_id}'],
  validate: (input) => {
    const result = inviteStoreUserSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { email, role } = inviteStoreUserSchema.parse(input)

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

    const { data, error } = await db
      .from('store_invitations')
      .insert({
        store_id: context.store_id,
        email,
        role,
        token,
        expires_at: expiresAt,
        invited_by: context.user_id,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitdigital.ar'
    const acceptUrl = `${appUrl}/invite/${token}`

    // Get store name for email
    const { data: storeData, error: storeError } = await db
      .from('stores')
      .select('name')
      .eq('id', context.store_id)
      .single()

    if (!storeError && storeData) {
      const storeName = (storeData as { name: string }).name
      const inviterName = 'El propietario de la tienda'

      const emailHtml = InvitationEmail({
        invitedEmail: email,
        inviterName,
        storeName,
        acceptUrl,
        role,
      })

      await sendEmail(
        email,
        `Invitación a colaborar en ${storeName} — KitDigital`,
        emailHtml
      )
    }

    return {
      ...data,
      accept_url: acceptUrl,
    }
  },
})

// ── cancel_invitation ────────────────────────────────────────

registerHandler({
  name: 'cancel_invitation',
  requires: ['multiuser'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['invitations:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { error } = await db
      .from('store_invitations')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { cancelled: true }
  },
})

// ── update_store_user_role ───────────────────────────────────

registerHandler({
  name: 'update_store_user_role',
  requires: ['multiuser'],
  permissions: ['owner'],
  event_type: null,
  invalidates: ['store_users:{store_id}'],
  validate: (input) => {
    const result = updateStoreUserRoleSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { user_id, role } = updateStoreUserRoleSchema.parse(input)

    // Cannot change owner's role
    const { data: targetUser } = await db
      .from('store_users')
      .select('role')
      .eq('user_id', user_id)
      .eq('store_id', context.store_id)
      .single()

    if ((targetUser as { role?: string } | null)?.role === 'owner') {
      throw new Error('No se puede cambiar el rol del propietario')
    }

    const { data, error } = await db
      .from('store_users')
      .update({ role })
      .eq('user_id', user_id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Usuario no encontrado')
    return data
  },
})

// ── remove_store_user ────────────────────────────────────────

registerHandler({
  name: 'remove_store_user',
  requires: ['multiuser'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['store_users:{store_id}'],
  validate: (input) => {
    const result = removeStoreUserSchema.safeParse(input)
    if (!result.success) {
      return { valid: false, code: 'INVALID_INPUT', message: 'user_id inválido' }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { user_id } = removeStoreUserSchema.parse(input)

    // Cannot remove owner
    const { data: targetUser } = await db
      .from('store_users')
      .select('role')
      .eq('user_id', user_id)
      .eq('store_id', context.store_id)
      .single()

    if ((targetUser as { role?: string } | null)?.role === 'owner') {
      throw new Error('No se puede eliminar al propietario de la tienda')
    }

    // Cannot remove yourself
    if (user_id === context.user_id) {
      throw new Error('No podés removerte a vos mismo')
    }

    const { error } = await db
      .from('store_users')
      .delete()
      .eq('user_id', user_id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { removed: true }
  },
})
