'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import type { ActionResult } from '@/lib/types'
import { z } from 'zod'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/** Obtiene el store_id del usuario autenticado (para usar en contexto de onboarding). */
async function getOnboardingStoreId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await db
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return (data as { store_id?: string } | null)?.store_id ?? null
}

// ── step1: nombre + whatsapp ─────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
  whatsapp: z
    .string()
    .regex(/^\d{10,15}$/, 'WhatsApp: solo números (10-15 dígitos, sin +)')
    .optional()
    .or(z.literal('')),
})

export async function onboardingStep1(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    name: formData.get('name'),
    whatsapp: formData.get('whatsapp') || undefined,
  }
  const parsed = step1Schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: { code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) } }
  }

  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  const update: Record<string, unknown> = { name: parsed.data.name }
  if (parsed.data.whatsapp) update.whatsapp = parsed.data.whatsapp

  const { error } = await db.from('stores').update(update).eq('id', storeId)
  if (error) return { success: false, error: { code: 'SYSTEM_ERROR', message: error.message } }

  redirect('/onboarding/logo')
}

// ── step2: logo ───────────────────────────────────────────────

export async function onboardingStep2(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const logoUrl = formData.get('logo_url') as string | null

  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  if (logoUrl) {
    const { error } = await db.from('stores').update({ logo_url: logoUrl }).eq('id', storeId)
    if (error) return { success: false, error: { code: 'SYSTEM_ERROR', message: error.message } }
  }

  redirect('/onboarding/product')
}

// ── step3: primer producto ────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  price: z.coerce.number().min(0, 'Precio inválido'),
  description: z.string().max(1000).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
})

export async function onboardingStep3(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    name: formData.get('name'),
    price: formData.get('price'),
    description: formData.get('description') || undefined,
    image_url: formData.get('image_url') || undefined,
  }
  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: { code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) } }
  }

  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  const { error } = await db.from('products').insert({
    store_id: storeId,
    name: parsed.data.name,
    price: parsed.data.price,
    description: parsed.data.description ?? null,
    image_url: parsed.data.image_url || null,
    is_active: true,
    stock: null,
  })

  if (error) return { success: false, error: { code: 'SYSTEM_ERROR', message: error.message } }

  redirect('/onboarding/done')
}

// ── step4: completar onboarding ──────────────────────────────

export async function completeOnboarding(): Promise<void> {
  const storeId = await getOnboardingStoreId()
  if (storeId) {
    // Leer config actual, mergear onboarding.completed = true
    const { data: store } = await db.from('stores').select('config').eq('id', storeId).single()
    const currentConfig = (store as { config?: Record<string, unknown> } | null)?.config ?? {}
    const newConfig = { ...currentConfig, onboarding: { completed: true } }
    await db.from('stores').update({ config: newConfig }).eq('id', storeId)
  }
  redirect('/admin')
}
