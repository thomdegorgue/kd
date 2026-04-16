import { supabaseServiceRole } from '@/lib/supabase/service-role'
import type { Plan } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ============================================================
// TIPOS LOCALES
// ============================================================

export type BillingInfo = {
  id: string
  billing_status: string
  mp_subscription_id: string | null
  mp_customer_id: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  last_billing_failure_at: string | null
  cancelled_at: string | null
  plan_id: string | null
  limits: Record<string, number>
  modules: Record<string, boolean>
}

// ============================================================
// QUERIES
// ============================================================

/**
 * Devuelve el plan activo (única fila en la tabla plans).
 */
export async function getPlan(): Promise<Plan> {
  const { data, error } = await db
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('Plan no encontrado')
  }
  return data as Plan
}

/**
 * Devuelve los campos de billing de una tienda.
 */
export async function getBillingInfo(storeId: string): Promise<BillingInfo> {
  const { data, error } = await db
    .from('stores')
    .select(
      'id, billing_status, mp_subscription_id, mp_customer_id, trial_ends_at, current_period_start, current_period_end, last_billing_failure_at, cancelled_at, plan_id, limits, modules',
    )
    .eq('id', storeId)
    .single()

  if (error || !data) {
    throw new Error('Tienda no encontrada')
  }
  return data as BillingInfo
}

/**
 * Devuelve el email del owner de una tienda.
 * Necesario para crear preapproval en MP (payer_email).
 */
export async function getStoreOwnerEmail(storeId: string): Promise<string> {
  const { data, error } = await db
    .from('store_users')
    .select('user_id, users!inner(email)')
    .eq('store_id', storeId)
    .eq('role', 'owner')
    .single()

  if (error || !data) {
    throw new Error('Owner no encontrado')
  }
  return (data.users as { email: string }).email
}
