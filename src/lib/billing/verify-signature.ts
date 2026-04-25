import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifica la firma HMAC-SHA256 de un webhook de Mercado Pago.
 *
 * MP envía dos headers:
 *   x-signature: "ts=<timestamp>,v1=<hash>"
 *   x-request-id: "<uuid>"
 * Y un query param: data.id=<data_id>
 *
 * El string a firmar es:
 *   id:<data.id>;request-id:<x-request-id>;ts:<timestamp>;
 *
 * Ref: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) {
    console.error('MP_WEBHOOK_SECRET no configurado')
    return false
  }

  if (!xSignature || !xRequestId || !dataId) return false

  // Parsear "ts=<ts>,v1=<hash>"
  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [key, value] = part.split('=')
      return [key.trim(), value?.trim() ?? '']
    }),
  )

  const ts = parts['ts']
  const v1 = parts['v1']

  if (!ts || !v1) return false

  // Construir el string de firma con el formato correcto de MP:
  // id:<data.id>;request-id:<x-request-id>;ts:<timestamp>;
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`

  const expectedHash = createHmac('sha256', secret)
    .update(template)
    .digest('hex')

  const expectedBuf = Buffer.from(expectedHash, 'hex')
  const receivedBuf = Buffer.from(v1.toLowerCase(), 'hex')
  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
