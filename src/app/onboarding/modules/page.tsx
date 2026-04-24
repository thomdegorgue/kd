import { createClient } from '@/lib/supabase/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { ModulesStepClient } from './modules-step-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

async function getStoreData(): Promise<{ storeId: string; modules: Record<string, boolean> } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: su } = await db
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const storeId = (su as { store_id?: string } | null)?.store_id
  if (!storeId) return null

  const { data: store } = await db
    .from('stores')
    .select('modules')
    .eq('id', storeId)
    .single()

  return {
    storeId,
    modules: (store as { modules?: Record<string, boolean> } | null)?.modules ?? {},
  }
}

export default async function OnboardingModulesPage() {
  const storeData = await getStoreData()
  return (
    <ModulesStepClient
      storeId={storeData?.storeId ?? ''}
      initialModules={storeData?.modules ?? {}}
    />
  )
}
