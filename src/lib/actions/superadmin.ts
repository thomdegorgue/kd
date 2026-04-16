'use server'

import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ModuleName } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ============================================================
// AUTH GUARD
// ============================================================

async function requireSuperadmin(): Promise<string> {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: userData } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'superadmin') {
    throw new Error('Acceso denegado')
  }

  return user.id
}

async function emitSuperadminEvent(
  actorId: string,
  type: string,
  storeId: string | null,
  data: Record<string, unknown>,
): Promise<void> {
  await db.from('events').insert({
    store_id: storeId,
    type,
    actor_type: 'superadmin',
    actor_id: actorId,
    data,
  })
}

// ============================================================
// STORES — ESTADO
// ============================================================

export type UpdateStoreStatusResult =
  | { success: true }
  | { success: false; error: string }

export async function updateStoreStatus(
  storeId: string,
  status: string,
  reason?: string,
): Promise<UpdateStoreStatusResult> {
  try {
    const actorId = await requireSuperadmin()

    await db.from('stores').update({ status, billing_status: status }).eq('id', storeId)

    await emitSuperadminEvent(actorId, 'store_status_changed', storeId, {
      new_status: status,
      reason: reason ?? 'superadmin_override',
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ============================================================
// STORES — MÓDULOS OVERRIDE
// ============================================================

export type OverrideModulesResult =
  | { success: true }
  | { success: false; error: string }

export async function overrideModules(
  storeId: string,
  modules: Partial<Record<ModuleName, boolean>>,
): Promise<OverrideModulesResult> {
  try {
    const actorId = await requireSuperadmin()

    // Leer módulos actuales y mergear
    const { data: storeData } = await db
      .from('stores')
      .select('modules')
      .eq('id', storeId)
      .single()

    const currentModules = (storeData?.modules as Record<string, boolean>) ?? {}
    const updatedModules = { ...currentModules, ...modules }

    await db.from('stores').update({ modules: updatedModules }).eq('id', storeId)

    await emitSuperadminEvent(actorId, 'modules_overridden', storeId, {
      changes: modules,
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ============================================================
// STORES — LÍMITES OVERRIDE
// ============================================================

export type OverrideLimitsResult =
  | { success: true }
  | { success: false; error: string }

export async function overrideLimits(
  storeId: string,
  limits: { max_products?: number; max_orders?: number; ai_tokens?: number },
): Promise<OverrideLimitsResult> {
  try {
    const actorId = await requireSuperadmin()

    const { data: storeData } = await db
      .from('stores')
      .select('limits')
      .eq('id', storeId)
      .single()

    const currentLimits = (storeData?.limits as Record<string, number>) ?? {}
    const updatedLimits = { ...currentLimits, ...limits }

    await db.from('stores').update({ limits: updatedLimits }).eq('id', storeId)

    await emitSuperadminEvent(actorId, 'limits_overridden', storeId, { limits })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ============================================================
// STORES — EXTENDER TRIAL
// ============================================================

export type ExtendTrialResult =
  | { success: true }
  | { success: false; error: string }

export async function extendTrial(
  storeId: string,
  newEndsAt: string,
): Promise<ExtendTrialResult> {
  try {
    const actorId = await requireSuperadmin()

    await db
      .from('stores')
      .update({ trial_ends_at: newEndsAt })
      .eq('id', storeId)

    await emitSuperadminEvent(actorId, 'trial_extended', storeId, {
      new_ends_at: newEndsAt,
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ============================================================
// USERS — BAN / UNBAN
// ============================================================

export type BanUserResult =
  | { success: true }
  | { success: false; error: string }

export async function banUser(userId: string): Promise<BanUserResult> {
  try {
    const actorId = await requireSuperadmin()

    await db
      .from('users')
      .update({ banned_at: new Date().toISOString() })
      .eq('id', userId)

    await emitSuperadminEvent(actorId, 'user_banned', null, { target_user_id: userId })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function unbanUser(userId: string): Promise<BanUserResult> {
  try {
    const actorId = await requireSuperadmin()

    await db.from('users').update({ banned_at: null }).eq('id', userId)

    await emitSuperadminEvent(actorId, 'user_unbanned', null, { target_user_id: userId })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ============================================================
// PLAN — ACTUALIZAR PRECIOS
// ============================================================

export type UpdatePlanPricingResult =
  | { success: true }
  | { success: false; error: string }

export async function updatePlanPricing(
  planId: string,
  data: {
    price_per_100_products?: number
    pro_module_price?: number
    trial_days?: number
    trial_max_products?: number
    base_modules?: string[]
  },
): Promise<UpdatePlanPricingResult> {
  try {
    const actorId = await requireSuperadmin()

    await db.from('plans').update(data).eq('id', planId)

    await emitSuperadminEvent(actorId, 'plan_pricing_updated', null, data)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
