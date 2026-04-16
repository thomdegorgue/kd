import { getPlan } from '@/lib/db/queries/billing'
import { PlanPricingForm } from '@/components/superadmin/plan-pricing-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SuperadminPlanPage() {
  const plan = await getPlan()

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Plan & Precios</h2>
        <p className="text-sm text-muted-foreground">
          Configuración del plan modular y precios del sistema.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Precio del plan</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanPricingForm plan={plan} />
        </CardContent>
      </Card>
    </div>
  )
}
