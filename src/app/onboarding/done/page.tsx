import { createClient } from '@/lib/supabase/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { OnboardingSteps } from '../_components/onboarding-steps'
import { DoneClient } from './done-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

async function getStoreData(): Promise<{
  slug: string | null
  billing_status: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { slug: null, billing_status: null }

  const { data } = await db
    .from('store_users')
    .select('store:stores(slug, billing_status)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const store = (data as { store?: { slug?: string; billing_status?: string } } | null)?.store
  return {
    slug: store?.slug ?? null,
    billing_status: store?.billing_status ?? null,
  }
}

type PageProps = {
  searchParams: Promise<{ status?: string }>
}

export default async function OnboardingDonePage({ searchParams }: PageProps) {
  const { status } = await searchParams
  const { slug, billing_status } = await getStoreData()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const catalogUrl = slug ? `${appUrl}/${slug}` : null

  return (
    <div className="space-y-6">
      <OnboardingSteps current={3} />
      <DoneClient
        catalogUrl={catalogUrl}
        billingStatus={billing_status}
        mpStatus={(status as 'success' | 'failure' | 'pending' | undefined) ?? null}
      />
    </div>
  )
}
