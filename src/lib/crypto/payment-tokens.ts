import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

// AES-256-GCM: authenticated encryption — detecta tampering y errores.
// Clave de 32 bytes en hex desde PAYMENT_TOKEN_ENCRYPTION_KEY.
// Formato guardado en DB: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.PAYMENT_TOKEN_ENCRYPTION_KEY
  if (!raw) throw new Error('PAYMENT_TOKEN_ENCRYPTION_KEY no configurado')
  const buf = Buffer.from(raw, 'hex')
  if (buf.length !== 32) throw new Error('PAYMENT_TOKEN_ENCRYPTION_KEY debe ser 32 bytes en hex (64 caracteres)')
  return buf
}

export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96 bits recomendado para GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

export function decryptToken(encrypted: string): string {
  const key = getKey()
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Formato de token cifrado inválido')
  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

/** Encripta access_token si viene en config. Devuelve config modificada. */
export function encryptPaymentConfig(config: Record<string, unknown>): Record<string, unknown> {
  if (typeof config.access_token !== 'string') return config
  const { access_token, ...rest } = config
  return { ...rest, access_token_enc: encryptToken(access_token) }
}

/** Desencripta access_token del config. Devuelve config con access_token en cleartext. */
export function decryptPaymentConfig(config: Record<string, unknown>): Record<string, unknown> {
  // Si ya viene cleartext (migración gradual: registros viejos), lo deja
  if (typeof config.access_token === 'string') return config
  if (typeof config.access_token_enc !== 'string') return config
  const { access_token_enc, ...rest } = config
  return { ...rest, access_token: decryptToken(access_token_enc) }
}
