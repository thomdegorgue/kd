'use client'

import { Zap, CheckCircle, AlertTriangle, Clock, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PackCard } from '@/components/admin/pack-card'
import { ModuleToggleList } from '@/components/admin/module-toggle-list'
import { PACKS, computePackTotal } from '@/lib/billing/packs'
import { formatARS } from '@/lib/billing/calculator'
import {
  useBilling,
  useCancelSubscription,
  useTogglePack,
} from '@/lib/hooks/use-billing'
import type { PackId } from '@/lib/billing/packs'

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

export function BillingPanel() {
  const { data, isLoading, isError } = useBilling()
  const togglePackMutation = useTogglePack()
  const cancelSubscriptionMutation = useCancelSubscription()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        No se pudo cargar la información de suscripción. Recargá la página o contactá soporte.
      </div>
    )
  }

  if (!data) return null

  const { billing } = data
  const billingStatus = billing.billing_status
  const currentTier = (billing.limits as Record<string, number>).max_products ?? 100
  const hasMpSubscription = !!billing.mp_subscription_id
  const isCancelled = !!billing.cancelled_at

  const isDemo = billingStatus === 'demo'
  const isActive = billingStatus === 'active'
  const isPastDue = billingStatus === 'past_due'

  // Detectar packs activos de los módulos
  const activePackIds: PackId[] = []
  const modules = billing.modules as Record<string, boolean>
  for (const pack of PACKS) {
    const allModulesActive = pack.modules.every(m => modules[m] === true)
    if (allModulesActive) activePackIds.push(pack.id as PackId)
  }

  const packPricing = computePackTotal(activePackIds)

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">Tu suscripción</h2>
              <p className="text-slate-300 text-sm">Gestiona tu plan, packs y acceso a módulos.</p>
            </div>
            <BillingStatusBadge status={billingStatus} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Costo mensual</p>
              <p className="text-4xl font-bold">{formatARS(packPricing.total + (billing.limits as Record<string, number>).max_products * 200000)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Próximo cobro</p>
              <p className="text-xl font-semibold">
                {billing.current_period_end
                  ? new Date(billing.current_period_end).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                    })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Packs activos</p>
              <p className="text-2xl font-bold">{activePackIds.filter(p => p !== 'core').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plan">Mi plan</TabsTrigger>
          <TabsTrigger value="modulos">Módulos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-6 pt-6">
          {/* PACKS GRID */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Elige tus módulos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PACKS.map(pack => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  isActive={activePackIds.includes(pack.id)}
                  onToggle={pack.id !== 'core' ? (enabled) => {
                    togglePackMutation.mutate({ pack_id: pack.id as PackId, enabled })
                  } : undefined}
                  disabled={pack.id === 'core' || !isActive}
                  isLoading={togglePackMutation.isPending}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* RESUMEN Y CTA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resumen de precio */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tier de productos ({currentTier})</span>
                    <span className="font-medium">{formatARS((Math.ceil(currentTier / 100) * 2000000))}</span>
                  </div>
                  {activePackIds.filter(p => p !== 'core').map(packId => (
                    <div key={packId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">+ {PACKS.find(p => p.id === packId)?.label}</span>
                      <span className="font-medium">{formatARS(1000000)}</span>
                    </div>
                  ))}
                  {packPricing.bundleDiscount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600 font-medium">
                      <span>Descuento bundle (3 packs)</span>
                      <span>−{formatARS(packPricing.bundleDiscount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold">Total mensual</span>
                    <span className="text-2xl font-bold">{formatARS(packPricing.total + (Math.ceil(currentTier / 100) * 2000000))}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Acciones */}
            <div className="space-y-3">
              {isActive && hasMpSubscription && !isCancelled && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="outline" size="lg" disabled={cancelSubscriptionMutation.isPending} className="w-full text-destructive">
                        Cancelar suscripción
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tu acceso continuará hasta el{' '}
                        {billing.current_period_end
                          ? new Date(billing.current_period_end).toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'fin del período actual'}
                        . Después la tienda pasará a modo vencido.
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

              {(isDemo || isPastDue) && (
                <Button size="lg" className="w-full gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/90">
                  <Zap className="h-4 w-4" />
                  Activar suscripción
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              )}

              {isActive && isCancelled && billing.current_period_end && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Suscripción cancelada. Acceso hasta el{' '}
                  {new Date(billing.current_period_end).toLocaleDateString('es-AR')}
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="modulos" className="pt-6">
          <ModuleToggleList />
        </TabsContent>

        <TabsContent value="historial" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Historial de pagos próximamente.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
