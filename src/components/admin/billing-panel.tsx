'use client'

import { useState } from 'react'
import { Zap, CheckCircle, AlertTriangle, Clock, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PRO_MODULES,
  computePriceBreakdown,
  calculateAnnualPrice,
  ANNUAL_INCLUDED_PRO_MODULES,
  formatARS,
  type PlanPricing,
  type AnnualPlanPricing,
} from '@/lib/billing/calculator'
import {
  useBilling,
  useCreateSubscription,
  useCancelSubscription,
  useChangeTier,
  useCreateAnnualSubscription,
} from '@/lib/hooks/use-billing'
import type { ModuleName, Plan } from '@/lib/types'

// ============================================================
// LABEL MAP para módulos pro
// ============================================================

const PRO_MODULE_LABELS: Record<string, string> = {
  variants: 'Variantes de producto',
  wholesale: 'Precios mayoristas',
  finance: 'Flujo de caja',
  expenses: 'Gastos detallados',
  savings_account: 'Cuentas de ahorro',
  multiuser: 'Múltiples usuarios',
  tasks: 'Tareas del equipo',
  assistant: 'Asistente IA',
}

// ============================================================
// BILLING STATUS BADGE
// ============================================================

function BillingStatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
        <CheckCircle className="h-3 w-3" />
        Activo
      </Badge>
    )
  }
  if (status === 'demo') {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1">
        <Clock className="h-3 w-3" />
        Prueba gratis
      </Badge>
    )
  }
  if (status === 'past_due') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Vencido
      </Badge>
    )
  }
  return <Badge variant="outline">{status}</Badge>
}

// ============================================================
// PRICE SUMMARY
// ============================================================

function PriceSummary({
  plan,
  tier,
  activeModules,
}: {
  plan: Plan & PlanPricing
  tier: number
  activeModules: Partial<Record<ModuleName, boolean>>
}) {
  const breakdown = computePriceBreakdown(plan, tier, activeModules)

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">
          Plan base ({tier} productos × {breakdown.tiers} tier{breakdown.tiers !== 1 ? 's' : ''})
        </span>
        <span className="font-medium">{formatARS(breakdown.basePrice)}</span>
      </div>

      {breakdown.activeProModules.map((m) => (
        <div key={m} className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">+ {PRO_MODULE_LABELS[m] ?? m}</span>
          <span className="font-medium">{formatARS(plan.pro_module_price)}</span>
        </div>
      ))}

      <Separator />

      <div className="flex justify-between items-center">
        <span className="font-semibold text-sm">Total mensual</span>
        <span className="text-lg font-bold">{formatARS(breakdown.total)}</span>
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function BillingPanel() {
  const { data, isLoading } = useBilling()
  const createSubscriptionMutation = useCreateSubscription()
  const cancelSubscriptionMutation = useCancelSubscription()
  const changeTierMutation = useChangeTier()
  const createAnnualMutation = useCreateAnnualSubscription()

  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [pendingProModules, setPendingProModules] = useState<Set<string> | null>(null)
  const [annualTier, setAnnualTier] = useState<number>(100)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const { plan, billing } = data
  const billingStatus = billing.billing_status
  const billingPeriod = billing.billing_period ?? 'monthly'
  const annualPaidUntil = billing.annual_paid_until
  const currentTier = (billing.limits as Record<string, number>).max_products ?? 100
  const currentModules = billing.modules as Partial<Record<ModuleName, boolean>>

  const tier = selectedTier ?? currentTier
  const activeModules = pendingProModules !== null
    ? Object.fromEntries([...pendingProModules].map((m) => [m, true])) as Partial<Record<ModuleName, boolean>>
    : currentModules

  const typedPlan = plan as Plan & PlanPricing
  const annualPlan = plan as Plan & AnnualPlanPricing
  const annualDiscountMonths =
    (annualPlan as unknown as { annual_discount_months?: number }).annual_discount_months ?? 2
  const monthlyEquivalent =
    Math.ceil(annualTier / 100) * typedPlan.price_per_100_products * 12
  const annualPrice = calculateAnnualPrice(annualPlan, annualTier)
  const annualSavings = monthlyEquivalent - annualPrice

  const tierOptions = [100, 200, 300, 500, 1000, 2000]

  function toggleProModule(module: string) {
    const base = pendingProModules ?? new Set(
      PRO_MODULES.filter((m) => currentModules[m] === true),
    )
    const next = new Set(base)
    if (next.has(module)) {
      next.delete(module)
    } else {
      next.add(module)
    }
    setPendingProModules(next)
  }

  const hasChanges =
    (selectedTier !== null && selectedTier !== currentTier) ||
    pendingProModules !== null

  function handleSubscribe() {
    const proModules = pendingProModules !== null
      ? [...pendingProModules]
      : PRO_MODULES.filter((m) => currentModules[m] === true)

    createSubscriptionMutation.mutate({ tier, pro_modules: proModules })
  }

  function handleChangeTier() {
    if (selectedTier) {
      changeTierMutation.mutate({ new_tier: selectedTier })
    }
  }

  const isBusy =
    createSubscriptionMutation.isPending ||
    cancelSubscriptionMutation.isPending ||
    changeTierMutation.isPending ||
    createAnnualMutation.isPending

  // ── DEMO → mostrar setup de suscripción ──────────────────────
  const isDemo = billingStatus === 'demo'
  const isActive = billingStatus === 'active'
  const isPastDue = billingStatus === 'past_due'
  const isAnnual = billingPeriod === 'annual'

  const PRO_MODULE_LABEL_LIST = ANNUAL_INCLUDED_PRO_MODULES.map(
    (m) => PRO_MODULE_LABELS[m] ?? m,
  )

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Estado actual */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Estado de suscripción</CardTitle>
            <BillingStatusBadge status={billingStatus} />
          </div>
          {isDemo && billing.trial_ends_at && (
            <CardDescription>
              Prueba gratuita hasta el{' '}
              {new Date(billing.trial_ends_at).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </CardDescription>
          )}
          {isActive && !isAnnual && billing.current_period_end && (
            <CardDescription>
              Próximo cobro:{' '}
              {new Date(billing.current_period_end).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </CardDescription>
          )}
          {isActive && isAnnual && annualPaidUntil && (
            <CardDescription>
              Plan anual activo hasta el{' '}
              {new Date(annualPaidUntil).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </CardDescription>
          )}
          {isPastDue && (
            <CardDescription className="text-destructive">
              Tu suscripción está vencida. Activá una nueva suscripción para recuperar el acceso completo.
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Selector de modalidad */}
      <Tabs defaultValue={isAnnual ? 'annual' : 'monthly'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly">Plan Mensual</TabsTrigger>
          <TabsTrigger value="annual">Plan Anual (2 meses gratis)</TabsTrigger>
        </TabsList>

        <TabsContent value="annual" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Plan Anual — Pago único</CardTitle>
              <CardDescription>
                Pagás {12 - annualDiscountMonths} meses y recibís 12. Incluye todos los módulos
                pro excepto Asistente IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tier de productos</label>
                <Select
                  value={String(annualTier)}
                  onValueChange={(v) => setAnnualTier(Number(v))}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tierOptions.map((t) => (
                      <SelectItem key={t} value={String(t)}>
                        {t} productos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Precio mensual equivalente</span>
                  <span className="line-through text-muted-foreground">
                    {formatARS(monthlyEquivalent)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Ahorro</span>
                  <span className="font-medium text-emerald-600">
                    −{formatARS(annualSavings)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">Total anual</span>
                  <span className="text-lg font-bold">{formatARS(annualPrice)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Módulos pro incluidos</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-5">
                  {PRO_MODULE_LABEL_LIST.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-1">
                  Asistente IA se contrata aparte como add-on mensual.
                </p>
              </div>

              <Button
                onClick={() => createAnnualMutation.mutate(annualTier)}
                disabled={isBusy}
                size="lg"
                className="gap-2 w-full sm:w-auto"
              >
                {createAnnualMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {isActive && isAnnual ? 'Renovar Plan Anual' : 'Contratar Plan Anual'}
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4 pt-4">
      {/* Tier de productos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tier de productos</CardTitle>
          <CardDescription>
            El precio base escala según cuántos productos querés poder tener activos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={String(tier)}
            onValueChange={(v) => setSelectedTier(Number(v))}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tierOptions.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t} productos — {formatARS(Math.ceil(t / 100) * typedPlan.price_per_100_products)}/mes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Módulos pro */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Módulos pro</CardTitle>
          <CardDescription>
            Cada módulo agrega {formatARS(typedPlan.pro_module_price)}/mes al total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PRO_MODULES.map((module) => {
            const isOn = pendingProModules !== null
              ? pendingProModules.has(module)
              : currentModules[module] === true

            return (
              <div key={module} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{PRO_MODULE_LABELS[module] ?? module}</p>
                  {isOn && (
                    <p className="text-xs text-muted-foreground">
                      + {formatARS(typedPlan.pro_module_price)}/mes
                    </p>
                  )}
                </div>
                <Switch
                  checked={isOn}
                  onCheckedChange={() => toggleProModule(module)}
                  disabled={isBusy}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Resumen de precio */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Resumen</p>
        <PriceSummary plan={typedPlan} tier={tier} activeModules={activeModules} />
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        {(isDemo || isPastDue) && (
          <Button
            onClick={handleSubscribe}
            disabled={isBusy}
            className="gap-2"
            size="lg"
          >
            {createSubscriptionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Activar suscripción
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        )}

        {isActive && hasChanges && selectedTier && selectedTier !== currentTier && (
          <Button
            onClick={handleChangeTier}
            disabled={isBusy}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            {changeTierMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Cambiar a {selectedTier} productos
          </Button>
        )}

        {isActive && !isAnnual && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="outline" size="lg" disabled={isBusy} className="text-destructive">
                  Cancelar suscripción
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tu acceso continuará hasta el fin del período actual pagado. Después la tienda
                  pasará a modo vencido y solo podrás leer los datos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No, mantener</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cancelSubscriptionMutation.mutate({})}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Sí, cancelar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
