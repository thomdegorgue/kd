/**
 * Lógica de aceptación de invitaciones.
 *
 * Módulo independiente — no importa el executor ni el registry
 * para evitar dependencias circulares cuando se usa desde páginas.
 */

import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

export async function acceptStoreInvitation(token: string): Promise<ActionResult<{ store_id: string }>> {
  const now = new Date().toISOString()

  // 1. Buscar invitación válida
  const { data: invitation, error: invErr } = await db
    .from('store_invitations')
    .select('id, store_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (invErr || !invitation) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Invitación no encontrada o ya usada' } }
  }

  if (invitation.accepted_at !== null) {
    return { success: false, error: { code: 'CONFLICT', message: 'Esta invitación ya fue aceptada' } }
  }

  if (invitation.expires_at < now) {
    return { success: false, error: { code: 'CONFLICT', message: 'La invitación expiró' } }
  }

  // 2. Verificar que el usuario autenticado tiene el email correcto
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sesión requerida' } }
  }

  if (user.email !== invitation.email) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Esta invitación es para otra dirección de email' },
    }
  }

  // 3. Verificar que no es ya miembro
  const { data: existing } = await db
    .from('store_users')
    .select('id')
    .eq('store_id', invitation.store_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return { success: false, error: { code: 'CONFLICT', message: 'Ya sos miembro de esta tienda' } }
  }

  // 4. Crear store_user
  const { error: suError } = await db.from('store_users').insert({
    store_id: invitation.store_id,
    user_id: user.id,
    role: invitation.role,
    accepted_at: now,
  })

  if (suError) {
    return { success: false, error: { code: 'SYSTEM_ERROR', message: suError.message } }
  }

  // 5. Marcar invitación como aceptada
  await db
    .from('store_invitations')
    .update({ accepted_at: now })
    .eq('id', invitation.id)

  // 6. Emitir evento
  await db.from('events').insert({
    store_id: invitation.store_id,
    type: 'invitation_accepted',
    actor_type: 'user',
    actor_id: user.id,
    data: { email: user.email, role: invitation.role },
  })

  return { success: true, data: { store_id: invitation.store_id } }
}
