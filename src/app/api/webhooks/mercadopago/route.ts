import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { verifyWebhookSignature } from '@/lib/billing/verify-signature'
import { getPreapproval, getPayment } from '@/lib/billing/mercadopago'
import { apiLimiter } from '@/lib/ratelimit'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ============================================================
// TIPOS
// ============================================================

type WebhookPayload = {
  id: string
  type: string
  action?: string
  data?: { id: string }
  date_created?: string
}

type BillingTransition = {
  billing_status?: string
  current_period_start?: string | null
  current_period_end?: string | null
  last_billing_failure_at?: string | null
  cancelled_at?: string | null
  mp_subscription_id?: string | null
  mp_customer_id?: string | null
}

// ============================================================
// HELPERS
// ============================================================

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

async function emitEvent(
  storeId: string,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db.from('events').insert({
    store_id: storeId,
    type,
    actor_type: 'system',
    actor_id: null,
    data,
  })
}

async function resolveStoreId(
  mpSubscriptionId: string,
): Promise<string | null> {
  const { data } = await db
    .from('stores')
    .select('id')
    .eq('mp_subscription_id', mpSubscriptionId)
    .single()
  return data?.id ?? null
}

async function updateStore(
  storeId: string,
  update: BillingTransition,
): Promise<void> {
  await db.from('stores').update(update).eq('id', storeId)
}

async function logWebhook(entry: {
  mp_event_id: string
  topic: string
  store_id: string | null
  raw_payload: unknown
  status: string
  error: string | null
  processing_time_ms: number
  result: string
}): Promise<void> {
  await db.from('billing_webhook_log').insert({
    ...entry,
    processed_at: new Date().toISOString(),
  })
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  // Rate limit: 30 requests per 10s per IP
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await apiLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const rawBody = await request.text()

  // 1. Verificar firma
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  if (!verifyWebhookSignature(xSignature, xRequestId)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 2. Parsear payload
  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const mpEventId = payload.id
  if (!mpEventId) {
    return NextResponse.json({ received: true })
  }

  // 3. Idempotencia — verificar si ya fue procesado
  const { data: existingLog } = await db
    .from('billing_webhook_log')
    .select('id, status')
    .eq('mp_event_id', mpEventId)
    .single()

  if (existingLog?.status === 'processed') {
    return NextResponse.json({ received: true, result: 'ignored_duplicate' })
  }

  // Insertar registro pendiente
  await db.from('billing_webhook_log').upsert({
    mp_event_id: mpEventId,
    topic: payload.type,
    store_id: null,
    raw_payload: payload,
    status: 'pending',
    error: null,
    processing_time_ms: 0,
    result: 'processing',
    processed_at: new Date().toISOString(),
  })

  let storeId: string | null = null
  let result = 'ignored_unknown_topic'
  let error: string | null = null

  try {
    // 4–6. Lógica según tipo de evento
    if (payload.type === 'payment' && payload.data?.id) {
      const payment = await getPayment(payload.data.id)
      const subscriptionId = payment.preapproval_id

      if (subscriptionId) {
        storeId = await resolveStoreId(subscriptionId)

        if (storeId) {
          if (payment.status === 'approved') {
            const now = new Date()
            const update: BillingTransition = {
              billing_status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: addDays(now, 30),
              last_billing_failure_at: null,
            }
            await updateStore(storeId, update)

            // Registrar en billing_payments
            const { data: planData } = await db
              .from('plans')
              .select('id')
              .eq('is_active', true)
              .single()

            if (planData) {
              await db.from('billing_payments').upsert({
                store_id: storeId,
                plan_id: planData.id,
                mp_payment_id: String(payment.id),
                mp_subscription_id: subscriptionId,
                amount: Math.round(payment.transaction_amount * 100),
                status: 'approved',
                paid_at: payment.date_approved ?? new Date().toISOString(),
              })
            }

            await emitEvent(storeId, 'billing_payment_approved', {
              mp_payment_id: payment.id,
              amount: payment.transaction_amount,
            })
            result = 'payment_approved'
          } else if (
            payment.status === 'rejected' ||
            payment.status === 'cancelled'
          ) {
            await updateStore(storeId, {
              billing_status: 'past_due',
              last_billing_failure_at: new Date().toISOString(),
            })
            await emitEvent(storeId, 'billing_payment_failed', {
              mp_payment_id: payment.id,
              status: payment.status,
            })
            result = 'payment_failed'
          } else {
            result = `payment_ignored_status_${payment.status}`
          }
        }
      }
    } else if (payload.type === 'subscription_preapproval' && payload.data?.id) {
      const subscription = await getPreapproval(payload.data.id)
      storeId = await resolveStoreId(subscription.id)

      if (storeId) {
        if (subscription.status === 'authorized') {
          const now = new Date()

          // Activar módulos pro pendientes
          const { data: storeData } = await db
            .from('stores')
            .select('config, modules')
            .eq('id', storeId)
            .single()
          const pendingModules = (storeData?.config as Record<string, unknown>)?.pending_pro_modules as string[] ?? []
          const currentModules = (storeData?.modules as Record<string, boolean>) ?? {}
          for (const m of pendingModules) {
            currentModules[m] = true
          }
          const updatedConfig = { ...(storeData?.config as Record<string, unknown> ?? {}), pending_pro_modules: [] }

          await db.from('stores').update({
            billing_status: 'active',
            mp_subscription_id: subscription.id,
            current_period_start: now.toISOString(),
            current_period_end: addDays(now, 30),
            modules: currentModules,
            config: updatedConfig,
          }).eq('id', storeId)

          await emitEvent(storeId, 'subscription_activated', {
            subscription_id: subscription.id,
            activated_modules: pendingModules,
          })
          result = 'subscription_activated'
        } else if (subscription.status === 'cancelled') {
          await updateStore(storeId, {
            cancelled_at: new Date().toISOString(),
          })
          await emitEvent(storeId, 'subscription_cancelled_by_mp', {
            subscription_id: subscription.id,
          })
          result = 'subscription_cancelled'
        } else if (subscription.status === 'paused') {
          await updateStore(storeId, {
            billing_status: 'past_due',
            last_billing_failure_at: new Date().toISOString(),
          })
          await emitEvent(storeId, 'subscription_paused', {
            subscription_id: subscription.id,
          })
          result = 'subscription_paused'
        } else {
          result = `subscription_ignored_status_${subscription.status}`
        }
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error desconocido'
    result = 'processing_error'
    console.error('[webhook/mercadopago] Error:', err)
  }

  // 7. Actualizar log con resultado final
  const processingTime = Date.now() - startTime
  await db
    .from('billing_webhook_log')
    .update({
      store_id: storeId,
      status: error ? 'failed' : 'processed',
      error,
      processing_time_ms: processingTime,
      result,
      processed_at: new Date().toISOString(),
    })
    .eq('mp_event_id', mpEventId)

  // Siempre 200 para que MP no reintente (manejamos idempotencia internamente)
  return NextResponse.json({ received: true, result })
}
