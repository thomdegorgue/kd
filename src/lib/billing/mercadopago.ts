// ============================================================
// Wrapper sobre la API REST de Mercado Pago
// No usa el SDK oficial para evitar conflictos con Next.js Edge.
// Todas las llamadas son server-side only.
// ============================================================

const MP_BASE = 'https://api.mercadopago.com'

function getAccessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN no configurado')
  return token
}

async function mpFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${MP_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MP API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// ============================================================
// TIPOS
// ============================================================

export type MpAutoRecurring = {
  frequency: number
  frequency_type: 'months' | 'days'
  transaction_amount: number
  currency_id: string
  start_date?: string
  end_date?: string
}

export type MpPreapproval = {
  id: string
  status: string
  init_point: string
  payer_id: number | null
  auto_recurring: MpAutoRecurring
  back_url: string
  reason: string
  date_created: string
  last_modified: string
}

export type MpPayment = {
  id: number
  status: string
  status_detail: string
  transaction_amount: number
  currency_id: string
  date_created: string
  date_approved: string | null
  preapproval_id: string | null
  external_reference: string | null
}

export type MpCheckoutPreference = {
  id: string
  init_point: string
  sandbox_init_point: string
  external_reference: string
  date_created: string
}

export type CreateCheckoutPreferenceParams = {
  store_id: string
  title: string
  amount: number // en pesos ARS (no centavos)
  payer_email?: string
  billing_period?: 'monthly' | 'annual'
  back_url: {
    success: string
    failure: string
    pending: string
  }
}

export type CreatePreapprovalParams = {
  payer_email: string
  reason: string
  auto_recurring: {
    frequency: 1
    frequency_type: 'months'
    transaction_amount: number // en pesos ARS (no centavos)
    currency_id: 'ARS'
  }
  back_url: string
}

// ============================================================
// FUNCIONES
// ============================================================

/**
 * Crea una suscripción mensual en MP.
 * Retorna el `init_point` al que redirigir al usuario.
 */
export async function createPreapproval(
  params: CreatePreapprovalParams,
): Promise<{ id: string; init_point: string }> {
  const data = await mpFetch<MpPreapproval>('/preapproval', {
    method: 'POST',
    body: JSON.stringify({
      reason: params.reason,
      auto_recurring: params.auto_recurring,
      back_url: params.back_url,
      payer_email: params.payer_email,
      status: 'pending',
    }),
  })

  return { id: data.id, init_point: data.init_point }
}

/**
 * Cancela una suscripción en MP.
 */
export async function cancelPreapproval(subscriptionId: string): Promise<void> {
  await mpFetch(`/preapproval/${subscriptionId}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'cancelled' }),
  })
}

/**
 * Obtiene el estado actual de una suscripción.
 */
export async function getPreapproval(
  subscriptionId: string,
): Promise<MpPreapproval> {
  return mpFetch<MpPreapproval>(`/preapproval/${subscriptionId}`)
}

/**
 * Obtiene los detalles de un pago por ID.
 */
export async function getPayment(paymentId: string): Promise<MpPayment> {
  return mpFetch<MpPayment>(`/v1/payments/${paymentId}`)
}

/**
 * Crea una Checkout Preference (pago único) en MP para el plan anual.
 * `external_reference = store_id` permite identificar el pago en el webhook.
 * Retorna `init_point` (prod) y `sandbox_init_point` (test) al que redirigir.
 */
export async function createCheckoutPreference(
  params: CreateCheckoutPreferenceParams,
): Promise<{ id: string; init_point: string; sandbox_init_point: string }> {
  const body: Record<string, unknown> = {
    items: [
      {
        id: `annual-${params.store_id}`,
        title: params.title,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: params.amount,
      },
    ],
    external_reference: params.billing_period
      ? `${params.store_id}|${params.billing_period}`
      : params.store_id,
    back_urls: params.back_url,
    auto_return: 'approved',
  }

  if (params.payer_email) {
    body.payer = { email: params.payer_email }
  }

  const data = await mpFetch<MpCheckoutPreference>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  }
}
