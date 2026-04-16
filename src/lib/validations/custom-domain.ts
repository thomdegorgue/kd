import { z } from 'zod'

// hostname like "mitienda.com" — no protocol, no trailing slash
const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/i

export const setCustomDomainSchema = z.object({
  domain: z
    .string()
    .min(4, 'El dominio es muy corto')
    .max(253)
    .regex(hostnameRegex, 'Dominio inválido. Ej: mitienda.com'),
})

export type SetCustomDomainInput = z.infer<typeof setCustomDomainSchema>
