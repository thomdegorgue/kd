'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createStore } from '@/lib/executor/handlers/stores'
import { loginSchema, signupSchema } from '@/lib/validations/auth'
import type { ActionResult } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── sendPasswordReset ────────────────────────────────────────

export async function sendPasswordReset(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) {
    return { success: false, error: { code: 'INVALID_INPUT', message: 'Ingresá tu email' } }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/reset-password`,
  })

  return { success: true, data: null }
}

// ── updatePassword ───────────────────────────────────────────

export async function updatePassword(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 8) {
    return { success: false, error: { code: 'INVALID_INPUT', message: 'La contraseña debe tener al menos 8 caracteres' } }
  }
  if (password !== confirm) {
    return { success: false, error: { code: 'INVALID_INPUT', message: 'Las contraseñas no coinciden' } }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: error.message } }
  }

  redirect('/admin')
}

// ── signIn ───────────────────────────────────────────────────

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: { code: 'INVALID_INPUT', message: issue.message } }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    const message =
      error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message
    return { success: false, error: { code: 'UNAUTHORIZED', message } }
  }

  redirect('/admin')
}

// ── signOut ──────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

// ── signUp ───────────────────────────────────────────────────

export async function signUp(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    password: formData.get('password'),
    store_name: formData.get('store_name'),
    store_slug: formData.get('store_slug'),
  }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      success: false,
      error: { code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) },
    }
  }

  const { email, password, full_name, store_name, store_slug } = parsed.data

  // 1. Verificar slug disponible
  const { data: existingStore } = await db
    .from('stores')
    .select('id')
    .eq('slug', store_slug)
    .maybeSingle()

  if (existingStore) {
    return {
      success: false,
      error: { code: 'CONFLICT', message: 'Esa URL ya está en uso, elegí otra', field: 'store_slug' },
    }
  }

  // 2. Crear usuario en Supabase Auth
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  })

  if (authError || !authData.user) {
    const message =
      authError?.message === 'User already registered'
        ? 'Ya existe una cuenta con ese email'
        : (authError?.message ?? 'Error al crear la cuenta')
    return { success: false, error: { code: 'CONFLICT', message } }
  }

  const userId = authData.user.id

  // 3. Crear registro en tabla users (perfil)
  await db.from('users').insert({
    id: userId,
    email,
    full_name,
    role: 'user',
  })

  // 4. Crear tienda (operación especial fuera del executor — no hay store_id previo)
  const createResult = await createStore({ store_name, store_slug, user_id: userId })

  if (!createResult.success) {
    // Rollback: eliminar usuario de auth si falla la creación de tienda
    await db.auth.admin.deleteUser(userId)
    return createResult as ActionResult
  }

  redirect('/onboarding')
}
