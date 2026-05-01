// ============================================================
// Mercado Pago — pagos de pedidos (tienda → cliente)
// Usa access_token por tienda (guardado en payment_methods.config).
// ============================================================

const MP_BASE = 'https://api.mercadopago.com'

async function mpFetchWithToken<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${MP_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`MP API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

export type MpPayment = {
  id: number
  status: string
  status_detail: string
  transaction_amount: number
  currency_id: string
  date_created: string
  date_approved: string | null
  external_reference: string | null
}

export type MpCheckoutPreference = {
  id: string
  init_point: string
  sandbox_init_point: string
  external_reference: string
  date_created: string
}

export async function validateMpAccessToken(accessToken: string): Promise<void> {
  // Endpoint liviano para validar credenciales
  await mpFetchWithToken(accessToken, '/users/me', { method: 'GET' })
}

export type CreateOrderCheckoutPreferenceParams = {
  title: string
  amountPesos: number
  payer_email?: string
  external_reference: string
  notification_url: string
  back_url: {
    success: string
    failure: string
    pending: string
  }
}

export async function createOrderCheckoutPreference(
  accessToken: string,
  params: CreateOrderCheckoutPreferenceParams,
): Promise<{ id: string; init_point: string; sandbox_init_point: string }> {
  const body: Record<string, unknown> = {
    items: [
      {
        id: 'order',
        title: params.title,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: params.amountPesos,
      },
    ],
    external_reference: params.external_reference,
    notification_url: params.notification_url,
    back_urls: params.back_url,
    auto_return: 'approved',
  }

  if (params.payer_email) {
    body.payer = { email: params.payer_email }
  }

  const data = await mpFetchWithToken<MpCheckoutPreference>(
    accessToken,
    '/checkout/preferences',
    { method: 'POST', body: JSON.stringify(body) },
  )

  return {
    id: data.id,
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  }
}

export async function getOrderPayment(accessToken: string, paymentId: string): Promise<MpPayment> {
  return mpFetchWithToken<MpPayment>(accessToken, `/v1/payments/${paymentId}`, { method: 'GET' })
}

