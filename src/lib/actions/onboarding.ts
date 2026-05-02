'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import type { ActionResult } from '@/lib/types'
import { z } from 'zod'
import { createCheckoutPreference } from '@/lib/billing/mercadopago'
import { calculateAnnualPrice, computeMonthlyTotal } from '@/lib/billing/calculator'
import { generateOnboardingContent } from '@/lib/actions/ai-onboarding'

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const step1Schema = z.object({
  name: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
  description: z.string().min(10, 'Contanos de qué trata tu negocio (mín. 10 caracteres)').max(500),
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
    description: formData.get('description'),
    whatsapp: formData.get('whatsapp') || undefined,
  }
  const parsed = step1Schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { success: false, error: { code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) } }
  }

  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  const slug = slugify(parsed.data.name)

  // Check slug uniqueness against other stores
  const { data: existing } = await db
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .neq('id', storeId)
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: { code: 'CONFLICT', message: 'Ese nombre ya está en uso. Probá con uno diferente.', field: 'name' },
    }
  }

  const update: Record<string, unknown> = { name: parsed.data.name, slug, description: parsed.data.description }
  if (parsed.data.whatsapp) update.whatsapp = parsed.data.whatsapp

  const { error } = await db.from('stores').update(update).eq('id', storeId)
  if (error) return { success: false, error: { code: 'SYSTEM_ERROR', message: error.message } }

  redirect('/onboarding/logo')
}

// ── step2: logo + color ──────────────────────────────────────

export async function onboardingStep2(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const logoUrl = formData.get('logo_url') as string | null
  const primaryColor = formData.get('primary_color') as string | null

  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  const { data: store } = await db.from('stores').select('config, slug').eq('id', storeId).single()
  const currentConfig = (store as { config?: Record<string, unknown>; slug?: string } | null)?.config ?? {}
  const slug = (store as { slug?: string } | null)?.slug ?? storeId

  const update: Record<string, unknown> = {}
  if (logoUrl) update.logo_url = logoUrl
  if (primaryColor) {
    update.config = { ...currentConfig, primary_color: primaryColor }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await db.from('stores').update(update).eq('id', storeId)
    if (error) return { success: false, error: { code: 'SYSTEM_ERROR', message: error.message } }
  }

  // Generar contenido IA (idempotente, fallback incluido, máx ~12s)
  await generateOnboardingContent(storeId)

  redirect(`/demo/${slug}`)
}

// ── step3: módulos ───────────────────────────────────────────

const OPTIONAL_BASE_MODULES = ['stock', 'payments', 'banners', 'social', 'product_page', 'shipping'] as const

export async function onboardingStepModules(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  const { data: store } = await db.from('stores').select('modules').eq('id', storeId).single()
  const currentModules = (store as { modules?: Record<string, boolean> } | null)?.modules ?? {}

  const updatedModules = { ...currentModules }
  for (const mod of OPTIONAL_BASE_MODULES) {
    updatedModules[mod] = formData.get(mod) === 'on'
  }

  const { error } = await db.from('stores').update({ modules: updatedModules }).eq('id', storeId)
  if (error) return { success: false, error: { code: 'SYSTEM_ERROR', message: error.message } }

  redirect('/onboarding/payment')
}

// ── step4: primer producto ────────────────────────────────────

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
    price: Math.round(parsed.data.price * 100),
    description: parsed.data.description ?? null,
    image_url: parsed.data.image_url || null,
    is_active: true,
  })

  if (error) return { success: false, error: { code: 'SYSTEM_ERROR', message: error.message } }

  redirect('/onboarding/done')
}

// ── payment: crear checkout preference ───────────────────────

export async function createOnboardingCheckout(
  billing_period: 'monthly' | 'annual',
): Promise<ActionResult<{ init_point: string }>> {
  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  // Obtener datos del plan activo
  const { data: plan, error: planError } = await db
    .from('plans')
    .select('price_per_100_products, pro_module_price, annual_discount_months')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (planError || !plan) {
    return { success: false, error: { code: 'SYSTEM_ERROR', message: 'No se pudo obtener el plan.' } }
  }

  const { data: store } = await db.from('stores').select('modules').eq('id', storeId).single()
  const modules = (store as { modules?: Record<string, boolean> } | null)?.modules ?? {}

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'

  const amountCentavos =
    billing_period === 'annual'
      ? calculateAnnualPrice(plan as { price_per_100_products: number; pro_module_price: number; annual_discount_months: number }, 100)
      : computeMonthlyTotal(plan as { price_per_100_products: number; pro_module_price: number }, 100, modules)

  try {
    const { init_point } = await createCheckoutPreference({
      store_id: storeId,
      title: billing_period === 'annual' ? 'KitDigital Plan Anual' : 'KitDigital Plan Mensual',
      amount: amountCentavos / 100,
      billing_period,
      back_url: {
        success: `${appUrl}/onboarding/done?status=success`,
        failure: `${appUrl}/onboarding/done?status=failure`,
        pending: `${appUrl}/onboarding/done?status=pending`,
      },
    })

    return { success: true, data: { init_point } }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear el pago'
    return { success: false, error: { code: 'SYSTEM_ERROR', message: msg } }
  }
}

// ── status: estado del onboarding para polling ────────────────

export async function getOnboardingStatus(): Promise<{
  billing_status: string | null
  email_confirmed: boolean
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { billing_status: null, email_confirmed: false }

  const email_confirmed = !!user.email_confirmed_at

  const storeId = await getOnboardingStoreId()
  if (!storeId) return { billing_status: null, email_confirmed }

  const { data: store } = await db
    .from('stores')
    .select('billing_status')
    .eq('id', storeId)
    .single()

  return {
    billing_status: (store as { billing_status?: string } | null)?.billing_status ?? null,
    email_confirmed,
  }
}

// ── step4: completar onboarding ──────────────────────────────

export async function completeOnboarding(): Promise<void> {
  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  // Solo permitir completar si el pago fue confirmado
  const { data: store } = await db
    .from('stores')
    .select('billing_status, config')
    .eq('id', storeId)
    .single()

  const billingStatus = (store as { billing_status?: string; config?: Record<string, unknown> } | null)?.billing_status
  if (billingStatus !== 'active') {
    redirect('/onboarding/payment')
  }

  // Marcar onboarding completo en config
  const currentConfig = (store as { config?: Record<string, unknown> } | null)?.config ?? {}
  const newConfig = { ...currentConfig, onboarding: { completed: true } }
  await db.from('stores').update({ config: newConfig }).eq('id', storeId)

  redirect('/admin')
}
