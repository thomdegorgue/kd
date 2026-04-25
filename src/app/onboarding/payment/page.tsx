import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { OnboardingSteps } from '../_components/onboarding-steps'
import { PaymentStepClient } from './payment-step-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

async function getPlan() {
  const { data } = await db
    .from('plans')
    .select('price_per_100_products, pro_module_price, annual_discount_months')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  return data as {
    price_per_100_products: number
    pro_module_price: number
    annual_discount_months: number
  } | null
}

export default async function OnboardingPaymentPage() {
  const plan = await getPlan()

  return (
    <div className="space-y-6">
      <OnboardingSteps current={3} />
      <PaymentStepClient plan={plan} />
    </div>
  )
}
