import { getSuperadminMetrics, listStores } from '@/lib/db/queries/superadmin'
import { getPlan } from '@/lib/db/queries/billing'
import { computeMonthlyTotal } from '@/lib/billing/calculator'
import { formatARS } from '@/lib/billing/calculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ModuleName } from '@/lib/types'

async function computeMRR(
  planPricing: { price_per_100_products: number; pro_module_price: number },
): Promise<number> {
  const { items } = await listStores({ billing_status: 'active', pageSize: 1000 })
  return items.reduce((sum, store) => {
    const maxProducts = (store.limits as Record<string, number>).max_products ?? 100
    const monthly = computeMonthlyTotal(planPricing, maxProducts, store.modules as Partial<Record<ModuleName, boolean>>)
    return sum + monthly
  }, 0)
}

export default async function SuperadminDashboard() {
  const [metrics, plan] = await Promise.all([getSuperadminMetrics(), getPlan()])
  const mrr = await computeMRR(plan)

  const cards = [
    { label: 'MRR', value: formatARS(mrr), sub: 'ingresos mensuales estimados' },
    { label: 'Tiendas activas', value: String(metrics.active), sub: `de ${metrics.total} total` },
    { label: 'En trial', value: String(metrics.demo), sub: 'demo gratuito activo' },
    { label: 'En mora', value: String(metrics.past_due), sub: 'past_due' },
    { label: 'Archivadas', value: String(metrics.archived), sub: 'sin acceso' },
    {
      label: 'Conversión demo→activo',
      value: `${metrics.conversionRate}%`,
      sub: 'activas / (activas + trial + mora)',
    },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Métricas globales del sistema.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Precio del plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">
              Base: <strong>{formatARS(plan.price_per_100_products)}</strong> / 100 productos
            </p>
            <p className="text-sm">
              Módulo pro: <strong>{formatARS(plan.pro_module_price)}</strong> / módulo / mes
            </p>
            <p className="text-sm">
              Trial:{' '}
              <Badge variant="outline">
                {plan.trial_days} días · {plan.trial_max_products} productos
              </Badge>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Distribución de estados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Activas', count: metrics.active, color: 'bg-emerald-500' },
              { label: 'Trial', count: metrics.demo, color: 'bg-blue-500' },
              { label: 'Mora', count: metrics.past_due, color: 'bg-amber-500' },
              { label: 'Archivadas', count: metrics.archived, color: 'bg-muted' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2 text-sm">
                <div className={`h-2 w-2 rounded-full ${row.color}`} />
                <span className="flex-1">{row.label}</span>
                <span className="font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
