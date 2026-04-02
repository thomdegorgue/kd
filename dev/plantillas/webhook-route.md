# Template — Route Handler de Webhook

> Leer antes: `/system/billing/webhooks.md` (pipeline completo de 9 pasos)
> Archivo: `src/app/api/webhooks/mercadopago/billing/route.ts`

---

## Route Handler completo con idempotencia

```typescript
// src/app/api/webhooks/mercadopago/billing/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Service role client — NUNCA exponer al cliente
// Solo en Route Handlers y Edge Functions del servidor
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ─── PASO 1: Verificación de firma HMAC-SHA256 ───────────────────────────────
function verifyWebhookSignature(request: NextRequest, rawBody: string): boolean {
  const xSignature = request.headers.get('x-signature') ?? ''
  const xRequestId = request.headers.get('x-request-id') ?? ''

  // Formato: "ts=1234567890,v1=abc123def..."
  const parts = Object.fromEntries(
    xSignature.split(',').map(part => part.split('=') as [string, string])
  )
  const ts = parts['ts']
  const v1 = parts['v1']

  if (!ts || !v1) return false

  // Manifest: "id={requestId};request-body={body}"
  const manifest = `id=${xRequestId};request-body=${rawBody}`
  const expected = crypto
    .createHmac('sha256', process.env.MP_WEBHOOK_SECRET!)
    .update(manifest)
    .digest('hex')

  // Comparación segura contra timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(v1, 'hex'),
    Buffer.from(expected, 'hex')
  )
}

// ─── HANDLER PRINCIPAL ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // PASO 1: Leer body raw (necesario para verificar firma)
  const rawBody = await request.text()

  // PASO 2: Verificar firma
  if (!verifyWebhookSignature(request, rawBody)) {
    console.error('[webhook/mp] Firma inválida')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // PASO 3: Parsear payload
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const topic   = payload.type as string
  const mpId    = (payload.data as any)?.id as string

  // Solo procesar topics relevantes
  if (!['subscription_preapproval', 'payment'].includes(topic)) {
    // Responder 200 para topics desconocidos (evitar reintentos de MP)
    return NextResponse.json({ received: true })
  }

  const db = getServiceClient()

  // PASO 4: Verificar idempotencia
  const eventKey = `${topic}:${mpId}`
  const { data: existing } = await db
    .from('billing_webhook_log')
    .select('id, status')
    .eq('mp_event_id', eventKey)
    .single()

  if (existing?.status === 'processed') {
    // Evento ya procesado — responder 200 sin reprocessar
    return NextResponse.json({ received: true, idempotent: true })
  }

  // PASO 5: Registrar como pendiente (prevenir procesamiento doble en caso de concurrencia)
  const { data: logEntry } = await db
    .from('billing_webhook_log')
    .upsert({
      mp_event_id: eventKey,
      topic,
      payload,
      status: 'processing',
      received_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  try {
    // PASO 6: Consultar estado actual en MP API (evitar confiar en el payload del webhook)
    const mpState = await fetchMPResourceState(topic, mpId)

    // PASO 7: Resolver tienda por mp_subscription_id o external_reference
    const storeId = await resolveStoreId(db, topic, mpState)
    if (!storeId) {
      console.error('[webhook/mp] No se encontró tienda para:', { topic, mpId })
      await markLog(db, logEntry?.id, 'skipped')
      return NextResponse.json({ received: true })
    }

    // PASO 8: Ejecutar lógica según tipo de evento
    await processWebhookEvent(db, topic, mpState, storeId)

    // PASO 9: Registrar evento de auditoría
    await db.from('events').insert({
      store_id:   storeId,
      type:       `billing_webhook_${topic}`,
      actor_type: 'system',
      actor_id:   null,
      data:       { topic, mpId, state: mpState },
    })

    // PASO 10: Marcar como procesado
    await markLog(db, logEntry?.id, 'processed')

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('[webhook/mp] Error procesando:', { topic, mpId, error })
    await markLog(db, logEntry?.id, 'failed')
    // Retornar 200 de todas formas para evitar reintentos infinitos de MP
    // El error queda registrado en billing_webhook_log para debugging
    return NextResponse.json({ received: true, error: 'processing_failed' })
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function fetchMPResourceState(topic: string, id: string) {
  const token = process.env.MP_ACCESS_TOKEN!
  const url = topic === 'payment'
    ? `https://api.mercadopago.com/v1/payments/${id}`
    : `https://api.mercadopago.com/preapproval/${id}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`MP API error: ${res.status}`)
  return res.json()
}

async function resolveStoreId(db: ReturnType<typeof getServiceClient>, topic: string, mpState: any): Promise<string | null> {
  if (topic === 'subscription_preapproval') {
    const { data } = await db
      .from('stores')
      .select('id')
      .eq('mp_subscription_id', mpState.id)
      .single()
    return data?.id ?? null
  }

  if (topic === 'payment') {
    // external_reference = store_id
    return mpState.external_reference ?? null
  }

  return null
}

async function processWebhookEvent(
  db: ReturnType<typeof getServiceClient>,
  topic: string,
  mpState: any,
  storeId: string
) {
  if (topic === 'subscription_preapproval') {
    await handleSubscriptionEvent(db, mpState, storeId)
  } else if (topic === 'payment') {
    await handlePaymentEvent(db, mpState, storeId)
  }
}

async function handleSubscriptionEvent(db: any, mpState: any, storeId: string) {
  const statusMap: Record<string, string> = {
    authorized:  'active',
    paused:      'past_due',
    cancelled:   'past_due',
    pending:     'demo',
  }

  const newBillingStatus = statusMap[mpState.status]
  if (!newBillingStatus) return

  await db.from('stores').update({
    billing_status:  newBillingStatus,
    mp_subscription_id: mpState.id,
    // Actualizar fechas de período si el status es active
    ...(newBillingStatus === 'active' && {
      current_period_start: new Date().toISOString(),
      current_period_end:   mpState.next_payment_date,
    }),
  }).eq('id', storeId)
}

async function handlePaymentEvent(db: any, mpState: any, storeId: string) {
  if (mpState.status === 'approved') {
    await db.from('billing_payments').insert({
      store_id:       storeId,
      mp_payment_id:  String(mpState.id),
      amount:         Math.round(mpState.transaction_amount * 100), // pesos → centavos
      status:         'approved',
      paid_at:        mpState.date_approved,
    })
  }
}

async function markLog(db: any, logId: string | undefined, status: string) {
  if (!logId) return
  await db.from('billing_webhook_log').update({
    status,
    processed_at: new Date().toISOString(),
  }).eq('id', logId)
}
```

---

## Checklist del webhook

- [ ] Firma HMAC verificada antes de cualquier procesamiento
- [ ] Firma inválida → retorna 401, no procesa nada
- [ ] Idempotencia verificada en `billing_webhook_log` antes de procesar
- [ ] Siempre retorna 200 al final (éxito o error) para evitar reintentos de MP
- [ ] Errores quedan en `billing_webhook_log.status = 'failed'` para debugging
- [ ] Consulta estado en API de MP (no confiar en el payload del webhook)
- [ ] Usa `SUPABASE_SERVICE_ROLE_KEY` (no el cliente anon)
- [ ] Evento de auditoría registrado en tabla `events`
- [ ] No hace lógica de billing directamente: delega a funciones específicas
