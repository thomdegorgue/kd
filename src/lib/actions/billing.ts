'use server'

import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { getStoreContext } from '@/lib/auth/store-context'
import { createPreapproval, cancelPreapproval } from '@/lib/billing/mercadopago'
import { computeMonthlyTotal, centavosToARS, isProModule } from '@/lib/billing/calculator'
import { getPlan, getBillingInfo, getStoreOwnerEmail } from '@/lib/db/queries/billing'
import {
  createSubscriptionSchema,
  cancelSubscriptionSchema,
  changeTierSchema,
  type CreateSubscriptionInput,
  type CancelSubscriptionInput,
  type ChangeTierInput,
} from '@/lib/validations/billing'
import type { ModuleName, Plan } from '@/lib/types'
import type { BillingInfo } from '@/lib/db/queries/billing'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ============================================================
// HELPERS
// ============================================================

async function emitBillingEvent(
  storeId: string,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db.from('events').insert({
    store_id: storeId,
    type,
    actor_type: 'user',
    actor_id: null,
    data,
  })
}

// ============================================================
// GET — info de billing para la UI
// ============================================================

export type BillingPageData = {
  plan: Plan
  billing: BillingInfo
  monthly_total: number
}

export async function getActivePlan(): Promise<BillingPageData> {
  const ctx = await getStoreContext()
  const [plan, billing] = await Promise.all([
    getPlan(),
    getBillingInfo(ctx.store_id),
  ])

  const monthly_total = computeMonthlyTotal(
    plan,
    (billing.limits as Record<string, number>).max_products ?? 100,
    billing.modules as Partial<Record<ModuleName, boolean>>,
  )

  return { plan, billing, monthly_total }
}

// ============================================================
// CREATE SUBSCRIPTION
// ============================================================

export type CreateSubscriptionResult =
  | { success: true; init_point: string }
  | { success: false; error: string }

export async function createSubscription(
  rawInput: unknown,
): Promise<CreateSubscriptionResult> {
  try {
    const ctx = await getStoreContext()
    const input = createSubscriptionSchema.parse(rawInput) as CreateSubscriptionInput

    const [plan, ownerEmail] = await Promise.all([
      getPlan(),
      getStoreOwnerEmail(ctx.store_id),
    ])

    // Construir módulos activos a partir del input
    const activeModules: Partial<Record<ModuleName, boolean>> = {}
    for (const m of input.pro_modules) {
      if (isProModule(m)) activeModules[m as ModuleName] = true
    }

    const totalCentavos = computeMonthlyTotal(plan, input.tier, activeModules)
    const totalARS = centavosToARS(totalCentavos)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'

    const { id: subscriptionId, init_point } = await createPreapproval({
      payer_email: ownerEmail,
      reason: `KitDigital — ${input.tier} productos + ${input.pro_modules.length} módulos pro`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: totalARS,
        currency_id: 'ARS',
      },
      back_url: `${appUrl}/admin/billing`,
    })

    // Guardar subscription_id en la tienda (se activa cuando llega el webhook)
    await db
      .from('stores')
      .update({
        mp_subscription_id: subscriptionId,
        // Guardar el tier elegido en limits para que el executor pueda validar
        limits: db.rpc
          ? undefined // no usar rpc, actualizar via jsonb_set si fuera necesario
          : undefined,
      })
      .eq('id', ctx.store_id)

    // Actualizar limits.max_products y guardar pending_pro_modules para activar en webhook
    const { data: storeData } = await db
      .from('stores')
      .select('limits, config')
      .eq('id', ctx.store_id)
      .single()

    const currentLimits = (storeData?.limits as Record<string, number>) ?? {}
    const currentConfig = (storeData?.config as Record<string, unknown>) ?? {}
    await db
      .from('stores')
      .update({
        mp_subscription_id: subscriptionId,
        limits: { ...currentLimits, max_products: input.tier },
        // Los módulos pro se activarán en stores.modules cuando llegue el webhook de confirmación
        config: { ...currentConfig, pending_pro_modules: input.pro_modules },
      })
      .eq('id', ctx.store_id)

    await emitBillingEvent(ctx.store_id, 'subscription_initiated', {
      subscription_id: subscriptionId,
      tier: input.tier,
      pro_modules: input.pro_modules,
      total_ars: totalARS,
    })

    return { success: true, init_point }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al crear suscripción'
    console.error('[billing] createSubscription error:', err)
    return { success: false, error: message }
  }
}

// ============================================================
// CANCEL SUBSCRIPTION
// ============================================================

export type CancelSubscriptionResult =
  | { success: true }
  | { success: false; error: string }

export async function cancelSubscription(
  rawInput: unknown = {},
): Promise<CancelSubscriptionResult> {
  try {
    const ctx = await getStoreContext()
    const input = cancelSubscriptionSchema.parse(rawInput) as CancelSubscriptionInput

    const billing = await getBillingInfo(ctx.store_id)

    if (!billing.mp_subscription_id) {
      return { success: false, error: 'No hay suscripción activa para cancelar' }
    }

    await cancelPreapproval(billing.mp_subscription_id)

    await db
      .from('stores')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', ctx.store_id)

    await emitBillingEvent(ctx.store_id, 'subscription_cancelled', {
      reason: input.reason ?? 'user_request',
      subscription_id: billing.mp_subscription_id,
    })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cancelar suscripción'
    console.error('[billing] cancelSubscription error:', err)
    return { success: false, error: message }
  }
}

// ============================================================
// CHANGE TIER
// ============================================================

export type ChangeTierResult =
  | { success: true; init_point: string }
  | { success: false; error: string }

export async function changeTier(rawInput: unknown): Promise<ChangeTierResult> {
  try {
    const ctx = await getStoreContext()
    const input = changeTierSchema.parse(rawInput) as ChangeTierInput

    const [billing, plan, ownerEmail] = await Promise.all([
      getBillingInfo(ctx.store_id),
      getPlan(),
      getStoreOwnerEmail(ctx.store_id),
    ])

    // Validar downgrade: no puede tener más productos activos que el nuevo tier
    const { data: productCount } = await db
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', ctx.store_id)
      .is('deleted_at', null)
      .eq('is_active', true)

    const activeProductCount = (productCount as { count: number } | null)?.count ?? 0
    if (activeProductCount > input.new_tier) {
      return {
        success: false,
        error: `Tenés ${activeProductCount} productos activos. Desactivá algunos antes de reducir a ${input.new_tier}.`,
      }
    }

    // Cancelar suscripción anterior si existe
    if (billing.mp_subscription_id) {
      await cancelPreapproval(billing.mp_subscription_id).catch((e) => {
        console.warn('[billing] No se pudo cancelar suscripción anterior:', e)
      })
    }

    // Crear nueva suscripción con el nuevo tier
    const activeModules = billing.modules as Partial<Record<ModuleName, boolean>>
    const totalCentavos = computeMonthlyTotal(plan, input.new_tier, activeModules)
    const totalARS = centavosToARS(totalCentavos)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'

    const { id: newSubscriptionId, init_point } = await createPreapproval({
      payer_email: ownerEmail,
      reason: `KitDigital — ${input.new_tier} productos`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: totalARS,
        currency_id: 'ARS',
      },
      back_url: `${appUrl}/admin/billing`,
    })

    // Actualizar limits.max_products y nueva subscription_id
    const currentLimits = (billing.limits as Record<string, number>) ?? {}
    await db
      .from('stores')
      .update({
        mp_subscription_id: newSubscriptionId,
        limits: { ...currentLimits, max_products: input.new_tier },
      })
      .eq('id', ctx.store_id)

    await emitBillingEvent(ctx.store_id, 'subscription_tier_changed', {
      old_tier: currentLimits.max_products,
      new_tier: input.new_tier,
      new_subscription_id: newSubscriptionId,
      total_ars: totalARS,
    })

    return { success: true, init_point }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cambiar tier'
    console.error('[billing] changeTier error:', err)
    return { success: false, error: message }
  }
}
