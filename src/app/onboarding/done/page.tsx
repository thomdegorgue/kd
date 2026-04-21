import { CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingSteps } from '../_components/onboarding-steps'
import { DoneClient } from './done-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

async function getStoreSlug(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await db
    .from('store_users')
    .select('store:stores(slug)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const store = (data as { store?: { slug?: string } } | null)?.store
  return store?.slug ?? null
}

export default async function OnboardingDonePage() {
  const slug = await getStoreSlug()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const catalogUrl = slug ? `${appUrl}/${slug}` : null

  return (
    <div className="space-y-6">
      <OnboardingSteps current={3} />

      <Card>
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">¡Tu tienda está lista!</CardTitle>
          <CardDescription>
            Ya podés compartir tu catálogo y empezar a recibir pedidos por WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DoneClient catalogUrl={catalogUrl} />
        </CardContent>
      </Card>
    </div>
  )
}
