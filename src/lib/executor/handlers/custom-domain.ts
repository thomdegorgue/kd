import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { setCustomDomainSchema } from '@/lib/validations/custom-domain'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── get_custom_domain_status ─────────────────────────────────

registerHandler({
  name: 'get_custom_domain_status',
  requires: ['custom_domain'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data, error } = await db
      .from('stores')
      .select('custom_domain, custom_domain_verified, custom_domain_verified_at, custom_domain_txt_token')
      .eq('id', context.store_id)
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── set_custom_domain ────────────────────────────────────────

registerHandler({
  name: 'set_custom_domain',
  requires: ['custom_domain'],
  permissions: ['owner'],
  event_type: null,
  invalidates: ['store_config:{store_id}'],
  validate: (input) => {
    const result = setCustomDomainSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { domain } = setCustomDomainSchema.parse(input)

    // Check not already used by another store
    const { data: existing } = await db
      .from('stores')
      .select('id')
      .eq('custom_domain', domain)
      .neq('id', context.store_id)
      .single()

    if (existing) {
      throw new Error('Este dominio ya está en uso por otra tienda')
    }

    // Generate a new TXT verification token
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    const txt_token = 'kitdigital-verify=' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

    const { data, error } = await db
      .from('stores')
      .update({
        custom_domain: domain,
        custom_domain_verified: false,
        custom_domain_verified_at: null,
        custom_domain_txt_token: txt_token,
      })
      .eq('id', context.store_id)
      .select('custom_domain, custom_domain_verified, custom_domain_txt_token')
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── verify_custom_domain ─────────────────────────────────────

registerHandler({
  name: 'verify_custom_domain',
  requires: ['custom_domain'],
  permissions: ['owner'],
  event_type: null,
  invalidates: ['store_config:{store_id}'],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { data: store, error: storeErr } = await db
      .from('stores')
      .select('custom_domain, custom_domain_txt_token')
      .eq('id', context.store_id)
      .single()

    if (storeErr || !store) throw new Error('Tienda no encontrada')

    const { custom_domain, custom_domain_txt_token } = store as {
      custom_domain: string | null
      custom_domain_txt_token: string | null
    }

    if (!custom_domain) throw new Error('No hay dominio configurado')
    if (!custom_domain_txt_token) throw new Error('No hay token de verificación')

    // Attempt DNS TXT lookup via Google DNS-over-HTTPS
    try {
      const res = await fetch(
        `https://dns.google/resolve?name=_kitdigital-verify.${custom_domain}&type=TXT`,
        { headers: { Accept: 'application/dns-json' } }
      )

      if (!res.ok) throw new Error('Error al consultar DNS')

      const json = await res.json() as { Answer?: { data: string }[] }
      const records = json.Answer ?? []
      const found = records.some((r) => r.data.replace(/"/g, '').includes(custom_domain_txt_token))

      if (!found) {
        return { verified: false, message: 'Registro TXT no encontrado. Puede tardar hasta 48h en propagarse.' }
      }

      const { error } = await db
        .from('stores')
        .update({ custom_domain_verified: true, custom_domain_verified_at: new Date().toISOString() })
        .eq('id', context.store_id)

      if (error) throw new Error(error.message)

      return { verified: true, message: 'Dominio verificado correctamente' }
    } catch (err) {
      return { verified: false, message: err instanceof Error ? err.message : 'Error de verificación' }
    }
  },
})

// ── remove_custom_domain ─────────────────────────────────────

registerHandler({
  name: 'remove_custom_domain',
  requires: ['custom_domain'],
  permissions: ['owner'],
  event_type: null,
  invalidates: ['store_config:{store_id}'],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const { error } = await db
      .from('stores')
      .update({
        custom_domain: null,
        custom_domain_verified: false,
        custom_domain_verified_at: null,
        custom_domain_txt_token: null,
      })
      .eq('id', context.store_id)

    if (error) throw new Error(error.message)
    return { removed: true }
  },
})
