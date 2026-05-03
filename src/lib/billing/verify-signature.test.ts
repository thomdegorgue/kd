import { createHmac } from 'crypto'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { verifyWebhookSignature } from '@/lib/billing/verify-signature'

const TEST_SECRET = 'test-webhook-secret-kitdigital'
const TEST_DATA_ID = 'data_id_12345'
const TEST_REQUEST_ID = 'req-uuid-abc-456'

function buildSignature(ts: number, dataId = TEST_DATA_ID, requestId = TEST_REQUEST_ID, secret = TEST_SECRET): string {
  const template = `id:${dataId};request-id:${requestId};ts:${ts};`
  const hash = createHmac('sha256', secret).update(template).digest('hex')
  return `ts=${ts},v1=${hash}`
}

describe('verifyWebhookSignature', () => {
  const now = Math.floor(Date.now() / 1000)

  beforeEach(() => {
    process.env.MP_WEBHOOK_SECRET = TEST_SECRET
  })

  afterEach(() => {
    delete process.env.MP_WEBHOOK_SECRET
  })

  // ── Casos felices ────────────────────────────────────────────

  it('acepta una firma válida con timestamp actual', () => {
    const sig = buildSignature(now)
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(true)
  })

  it('acepta timestamp con 200 segundos de antigüedad (dentro de ±5 min)', () => {
    const sig = buildSignature(now - 200)
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(true)
  })

  it('acepta timestamp futuro de 200 segundos (dentro de ±5 min)', () => {
    const sig = buildSignature(now + 200)
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(true)
  })

  // ── Anti-replay ──────────────────────────────────────────────

  it('rechaza timestamp con más de 5 minutos de antigüedad', () => {
    const sig = buildSignature(now - 400)
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  it('rechaza timestamp con más de 5 minutos en el futuro', () => {
    const sig = buildSignature(now + 400)
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  // ── Firma incorrecta ─────────────────────────────────────────

  it('rechaza firma con secret incorrecto', () => {
    const sig = buildSignature(now, TEST_DATA_ID, TEST_REQUEST_ID, 'wrong-secret')
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  it('rechaza firma con data_id distinto al firmado', () => {
    const sig = buildSignature(now, 'otro_data_id')
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  it('rechaza firma con request_id distinto al firmado', () => {
    const sig = buildSignature(now, TEST_DATA_ID, 'otro-request-id')
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  // ── Parámetros faltantes ─────────────────────────────────────

  it('rechaza si MP_WEBHOOK_SECRET no está configurado', () => {
    delete process.env.MP_WEBHOOK_SECRET
    const sig = buildSignature(now)
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  it('rechaza si xSignature es null', () => {
    expect(verifyWebhookSignature(null, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  it('rechaza si xRequestId es null', () => {
    const sig = buildSignature(now)
    expect(verifyWebhookSignature(sig, null, TEST_DATA_ID)).toBe(false)
  })

  it('rechaza si dataId es null', () => {
    const sig = buildSignature(now)
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, null)).toBe(false)
  })

  // ── Formato inválido ─────────────────────────────────────────

  it('rechaza firma con formato inválido (sin ts=)', () => {
    expect(verifyWebhookSignature('invalid-format', TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  it('rechaza firma con v1 vacío', () => {
    expect(verifyWebhookSignature(`ts=${now},v1=`, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })

  it('rechaza ts no numérico', () => {
    const sig = `ts=not_a_number,v1=abc123`
    expect(verifyWebhookSignature(sig, TEST_REQUEST_ID, TEST_DATA_ID)).toBe(false)
  })
})
