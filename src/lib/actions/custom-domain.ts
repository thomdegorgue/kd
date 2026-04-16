'use server'

import { executeAction } from './helpers'
import type { SetCustomDomainInput } from '@/lib/validations/custom-domain'

export type CustomDomainStatus = {
  custom_domain: string | null
  custom_domain_verified: boolean
  custom_domain_verified_at: string | null
  custom_domain_txt_token: string | null
}

export async function getCustomDomainStatus() {
  return executeAction<CustomDomainStatus>('get_custom_domain_status', {})
}

export async function setCustomDomain(input: SetCustomDomainInput) {
  return executeAction<CustomDomainStatus>('set_custom_domain', input)
}

export async function verifyCustomDomain() {
  return executeAction<{ verified: boolean; message: string }>('verify_custom_domain', {})
}

export async function removeCustomDomain() {
  return executeAction<{ removed: boolean }>('remove_custom_domain', {})
}
