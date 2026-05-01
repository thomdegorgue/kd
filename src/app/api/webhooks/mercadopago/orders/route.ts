import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { verifyWebhookSignature } from '@/lib/billing/verify-signature'
import { getOrderPayment } from '@/lib/payments/mercadopago'

const db = supabaseServiceRole

type WebhookPayload = {
  id?: string
  type?: string
  data?: { id?: string }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  // Validación de firma (mismo formato que billing)
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')
  const dataId = request.nextUrl.searchParams.get('data.id')

  if (!verifyWebhookSignature(xSignature, xRequestId, dataId)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const rawBody = await request.text()
  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const mpEventId = payload?.id
  const topic = payload?.type ?? 'unknown'
  const storeId = request.nextUrl.searchParams.get('store')

  if (!mpEventId) return NextResponse.json({ received: true })
  if (!storeId) return NextResponse.json({ error: 'Missing store' }, { status: 400 })

  // Idempotencia: order_webhook_log
  const { data: existing } = await db
    .from('order_webhook_log')
    .select('id, status')
    .eq('mp_event_id', mpEventId)
    .single()

  if (existing?.status === 'processed') {
    return NextResponse.json({ received: true, result: 'ignored_duplicate' })
  }

  await db.from('order_webhook_log').upsert({
    mp_event_id: mpEventId,
    topic,
    store_id: storeId,
    order_id: null,
    raw_payload: payload,
    status: 'pending',
    error: null,
    processing_time_ms: 0,
    result: 'processing',
    processed_at: new Date().toISOString(),
  })

  let result = 'ignored'
  let error: string | null = null
  let orderId: string | null = null

  try {
    if (payload?.type !== 'payment' || !payload?.data?.id) {
      result = 'ignored_non_payment'
    } else {
      // Obtener access token del método MP activo configurado por la tienda
      const { data: mpMethod } = await db
        .from('payment_methods')
        .select('config')
        .eq('store_id', storeId)
        .eq('type', 'mp')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      const cfg = (mpMethod?.config ?? {}) as Record<string, unknown>
      const accessToken = String(cfg.access_token ?? '')
      if (!accessToken) {
        result = 'missing_mp_access_token'
      } else {
        const payment = await getOrderPayment(accessToken, String(payload.data.id))
        const ext = payment.external_reference ?? ''

        // external_reference esperado: order:<uuid>
        if (!ext.startsWith('order:')) {
          result = 'ignored_unknown_external_reference'
        } else {
          orderId = ext.slice('order:'.length)
          // Confirmar pago
          if (payment.status === 'approved') {
            await db.from('payments').update({
              status: 'approved',
              method: 'mp',
              mp_payment_id: String(payment.id),
              paid_at: payment.date_approved ?? new Date().toISOString(),
            }).eq('store_id', storeId).eq('order_id', orderId)

            await db.from('orders').update({ status: 'confirmed' }).eq('store_id', storeId).eq('id', orderId)
            result = 'order_payment_approved'
          } else {
            // Guardamos el mp_payment_id igualmente para trazabilidad
            await db.from('payments').update({
              mp_payment_id: String(payment.id),
            }).eq('store_id', storeId).eq('order_id', orderId)

            result = `order_payment_${payment.status}`
          }
        }
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
    result = 'failed'
  }

  const elapsed = Date.now() - startTime
  await db.from('order_webhook_log').update({
    status: error ? 'failed' : 'processed',
    error,
    result,
    order_id: orderId,
    processing_time_ms: elapsed,
    processed_at: new Date().toISOString(),
  }).eq('mp_event_id', mpEventId)

  return NextResponse.json({ received: true, result })
}

