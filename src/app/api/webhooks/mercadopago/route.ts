import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { verifyWebhookSignature } from '@/lib/billing/verify-signature'
import { getPreapproval, getPayment } from '@/lib/billing/mercadopago'
import { ANNUAL_INCLUDED_PRO_MODULES } from '@/lib/billing/calculator'
import { packsToModules, type PackId } from '@/lib/billing/packs'
import { sendEmail } from '@/lib/email/resend'
import { WelcomeEmail } from '@/lib/email/templates/welcome'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Parsea external_reference: puede ser "uuid" (legacy) o "uuid|monthly"/"uuid|annual"
function parseExternalReference(ref: string): { storeId: string; billingPeriod: 'monthly' | 'annual' } {
  const pipeIdx = ref.indexOf('|')
  if (pipeIdx !== -1) {
    return {
      storeId: ref.slice(0, pipeIdx),
      billingPeriod: ref.slice(pipeIdx + 1) === 'monthly' ? 'monthly' : 'annual',
    }
  }
  return { storeId: ref, billingPeriod: 'annual' }
}

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
  billing_period?: 'monthly' | 'annual'
  annual_paid_until?: string | null
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

async function getStoreOwnerEmail(storeId: string): Promise<string | null> {
  const { data, error } = await db
    .from('store_users')
    .select('user_id, users:user_id(email)')
    .eq('store_id', storeId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const users = (data as { users?: { email?: string } | { email?: string }[] }).users
  if (Array.isArray(users)) return users[0]?.email ?? null
  return users?.email ?? null
}

async function sendWelcomeEmailIfFirstPayment(storeId: string): Promise<void> {
  // Si ya hubo pagos aprobados antes, no es el “primer pago”.
  const { count } = await db
    .from('billing_payments')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'approved')

  if ((count ?? 0) !== 1) return

  const ownerEmail = await getStoreOwnerEmail(storeId)
  if (!ownerEmail) return

  const { data: store } = await db
    .from('stores')
    .select('name, slug')
    .eq('id', storeId)
    .single()

  if (!store?.slug) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'
  const isDev = process.env.NODE_ENV === 'development'
  const catalogUrl = isDev ? `${appUrl.replace(/\/$/, '')}/${store.slug}` : `https://${store.slug}.${domain}`
  const adminUrl = `${appUrl.replace(/\/$/, '')}/admin`

  const emailHtml = WelcomeEmail({
    ownerEmail,
    storeName: store.name ?? 'tu tienda',
    adminUrl,
    catalogUrl,
  })

  await sendEmail(ownerEmail, `Bienvenido/a — ${store.name ?? 'KitDigital'}`, emailHtml)
}

async function updateStore(
  storeId: string,
  update: BillingTransition,
): Promise<void> {
  await db.from('stores').update(update).eq('id', storeId)
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  const rawBody = await request.text()

  // 1. Verificar firma HMAC con el template correcto de MP:
  //    id:<data.id>;request-id:<x-request-id>;ts:<timestamp>;
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')
  const dataId = request.nextUrl.searchParams.get('data.id')

  if (!verifyWebhookSignature(xSignature, xRequestId, dataId)) {
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

      // Rama pago único (sin preapproval_id): puede ser plan mensual o anual vía Checkout Pro
      if (!subscriptionId && payment.external_reference) {
        const { storeId: parsedStoreId, billingPeriod: parsedPeriod } = parseExternalReference(payment.external_reference)

        if (!UUID_REGEX.test(parsedStoreId)) {
          result = 'checkout_unknown_store'
        } else {
          const { data: storeRow } = await db
            .from('stores')
            .select('id')
            .eq('id', parsedStoreId)
            .single()

          if (!storeRow) {
            result = 'checkout_unknown_store'
          } else {
            storeId = storeRow.id as string

            if (payment.status === 'approved') {
              const { data: planData } = await db
                .from('plans')
                .select('id')
                .eq('is_active', true)
                .single()

              if (parsedPeriod === 'annual') {
                const now = new Date()
                const paidUntil = new Date(now)
                paidUntil.setDate(paidUntil.getDate() + 365)

                const { data: storeData } = await db
                  .from('stores')
                  .select('modules')
                  .eq('id', storeId)
                  .single()

                const currentModules = (storeData?.modules as Record<string, boolean>) ?? {}
                for (const m of ANNUAL_INCLUDED_PRO_MODULES) {
                  currentModules[m] = true
                }

                await db.from('stores').update({
                  billing_status: 'active',
                  billing_period: 'annual',
                  annual_paid_until: paidUntil.toISOString().slice(0, 10),
                  modules: currentModules,
                  last_billing_failure_at: null,
                }).eq('id', storeId)

                if (planData) {
                  await db.from('billing_payments').upsert({
                    store_id: storeId,
                    plan_id: planData.id,
                    mp_payment_id: String(payment.id),
                    mp_subscription_id: null,
                    amount: Math.round(payment.transaction_amount * 100),
                    status: 'approved',
                    paid_at: payment.date_approved ?? new Date().toISOString(),
                  })
                }

                await emitEvent(storeId, 'annual_subscription_created', {
                  mp_payment_id: payment.id,
                  amount: payment.transaction_amount,
                  paid_until: paidUntil.toISOString().slice(0, 10),
                  modules_activated: [...ANNUAL_INCLUDED_PRO_MODULES],
                })
                result = 'annual_subscription_created'
              } else {
                // Pago mensual único vía Checkout Pro
                const now = new Date()
                await db.from('stores').update({
                  billing_status: 'active',
                  billing_period: 'monthly',
                  current_period_start: now.toISOString(),
                  current_period_end: addDays(now, 30),
                  last_billing_failure_at: null,
                }).eq('id', storeId)

                if (planData) {
                  await db.from('billing_payments').upsert({
                    store_id: storeId,
                    plan_id: planData.id,
                    mp_payment_id: String(payment.id),
                    mp_subscription_id: null,
                    amount: Math.round(payment.transaction_amount * 100),
                    status: 'approved',
                    paid_at: payment.date_approved ?? new Date().toISOString(),
                  })
                }

                await emitEvent(storeId, 'monthly_payment_created', {
                  mp_payment_id: payment.id,
                  amount: payment.transaction_amount,
                })
                result = 'monthly_payment_created'
              }

              await sendWelcomeEmailIfFirstPayment(storeId)
            } else if (
              payment.status === 'rejected' ||
              payment.status === 'cancelled'
            ) {
              await emitEvent(storeId, 'checkout_payment_failed', {
                mp_payment_id: payment.id,
                status: payment.status,
                billing_period: parsedPeriod,
              })
              result = 'checkout_payment_failed'
            } else {
              result = `checkout_payment_ignored_status_${payment.status}`
            }
          }
        }
      } else if (subscriptionId) {
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
            await sendWelcomeEmailIfFirstPayment(storeId)
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

          const config = (storeData?.config as Record<string, unknown>) ?? {}
          const pendingLegacyModules = (config.pending_pro_modules as string[]) ?? []
          const pendingPacks = (config.pending_packs as PackId[]) ?? []

          const pendingPackModules = pendingPacks.length > 0 ? packsToModules(pendingPacks) : {}
          const pendingModules = [
            ...pendingLegacyModules,
            ...Object.keys(pendingPackModules),
          ]

          const currentModules = (storeData?.modules as Record<string, boolean>) ?? {}
          for (const m of pendingModules) {
            currentModules[m] = true
          }
          const updatedConfig = {
            ...config,
            pending_pro_modules: [],
            pending_packs: [],
          }

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
            activated_packs: pendingPacks,
          })
          // Por las dudas, si el primer cobro se registró antes que el preapproval authorized.
          await sendWelcomeEmailIfFirstPayment(storeId)
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
