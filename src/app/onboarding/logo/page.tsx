import { createClient } from '@/lib/supabase/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { LogoStepClient } from './logo-step-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

async function getStoreId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await db
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  return (data as { store_id?: string } | null)?.store_id ?? null
}

export default async function OnboardingLogoPage() {
  const storeId = await getStoreId()
  return <LogoStepClient storeId={storeId ?? ''} />
}
