'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import type { StoreRow } from '@/lib/db/queries/superadmin'
import type { ModuleName } from '@/lib/types'
import { PRO_MODULES, BASE_MODULES } from '@/lib/billing/calculator'
import {
  updateStoreStatus,
  overrideModules,
  overrideLimits,
  extendTrial,
} from '@/lib/actions/superadmin'

const CORE_MODULES: readonly ModuleName[] = [] as const

const MODULE_LABELS: Record<ModuleName, string> = {
  catalog: 'Catálogo',
  products: 'Productos',
  categories: 'Categorías',
  cart: 'Carrito',
  orders: 'Pedidos',
  stock: 'Stock',
  payments: 'Pagos',
  banners: 'Banners',
  social: 'Redes sociales',
  product_page: 'Página de producto',
  shipping: 'Envíos',
  variants: 'Variantes',
  wholesale: 'Mayorista',
  finance: 'Finanzas',
  expenses: 'Gastos',
  savings_account: 'Caja de ahorro',
  multiuser: 'Multiusuario',
  custom_domain: 'Dominio propio',
  tasks: 'Tareas',
  assistant: 'Asistente IA',
}

type Props = {
  store: StoreRow
}

export function StoreDetailPanel({ store }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Status
  const [status, setStatus] = useState(store.billing_status)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // Modules
  const [modules, setModules] = useState<Record<string, boolean>>(
    store.modules as Record<string, boolean>,
  )
  const [modulesMsg, setModulesMsg] = useState<string | null>(null)

  // Limits
  const [maxProducts, setMaxProducts] = useState(
    String((store.limits as Record<string, number>).max_products ?? 100),
  )
  const [maxOrders, setMaxOrders] = useState(
    String((store.limits as Record<string, number>).max_orders ?? 0),
  )
  const [aiTokens, setAiTokens] = useState(
    String((store.limits as Record<string, number>).ai_tokens ?? 0),
  )
  const [limitsMsg, setLimitsMsg] = useState<string | null>(null)

  // Trial
  const [trialDate, setTrialDate] = useState(
    store.trial_ends_at ? store.trial_ends_at.split('T')[0] : '',
  )
  const [trialMsg, setTrialMsg] = useState<string | null>(null)

  const handleStatusSave = () => {
    startTransition(async () => {
      const result = await updateStoreStatus(store.id, status)
      setStatusMsg(result.success ? 'Guardado.' : result.error.message)
      if (result.success) router.refresh()
    })
  }

  const handleModuleToggle = (mod: ModuleName, value: boolean) => {
    const updated = { ...modules, [mod]: value }
    setModules(updated)
    startTransition(async () => {
      const result = await overrideModules(store.id, { [mod]: value })
      setModulesMsg(result.success ? 'Guardado.' : result.error.message)
      if (result.success) router.refresh()
    })
  }

  const handleLimitsSave = () => {
    startTransition(async () => {
      const result = await overrideLimits(store.id, {
        max_products: Number(maxProducts),
        max_orders: Number(maxOrders),
        ai_tokens: Number(aiTokens),
      })
      setLimitsMsg(result.success ? 'Guardado.' : result.error.message)
      if (result.success) router.refresh()
    })
  }

  const handleTrialSave = () => {
    if (!trialDate) return
    startTransition(async () => {
      const result = await extendTrial(store.id, new Date(trialDate).toISOString())
      setTrialMsg(result.success ? 'Guardado.' : result.error.message)
      if (result.success) router.refresh()
    })
  }

  const allModules: ModuleName[] = [
    ...BASE_MODULES,
    ...PRO_MODULES,
  ]

  return (
    <div className="space-y-6">
      {/* Estado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Estado de la tienda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v ?? store.billing_status)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Trial</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="past_due">En mora</SelectItem>
                <SelectItem value="suspended">Suspendida</SelectItem>
                <SelectItem value="archived">Archivada</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleStatusSave} disabled={pending} size="sm">
              Guardar estado
            </Button>
          </div>
          {statusMsg && (
            <p className="text-xs text-muted-foreground">{statusMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Módulos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Módulos (override superadmin)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs text-muted-foreground mb-3">
            Sin restricción de billing. Los cambios se aplican inmediatamente.
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {allModules.map((mod) => {
              const isPro = PRO_MODULES.includes(mod)
              return (
                <div
                  key={mod}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm truncate">{MODULE_LABELS[mod]}</span>
                    {isPro && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                        Pro
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={modules[mod] === true}
                    onCheckedChange={(v) => handleModuleToggle(mod, v)}
                    disabled={pending}
                  />
                </div>
              )
            })}
          </div>
          {modulesMsg && (
            <p className="text-xs text-muted-foreground mt-2">{modulesMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Límites */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Límites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="max_products" className="text-xs">
                Máx. productos
              </Label>
              <Input
                id="max_products"
                type="number"
                value={maxProducts}
                onChange={(e) => setMaxProducts(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_orders" className="text-xs">
                Máx. pedidos / mes
              </Label>
              <Input
                id="max_orders"
                type="number"
                value={maxOrders}
                onChange={(e) => setMaxOrders(e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai_tokens" className="text-xs">
                Tokens IA
              </Label>
              <Input
                id="ai_tokens"
                type="number"
                value={aiTokens}
                onChange={(e) => setAiTokens(e.target.value)}
                min={0}
              />
            </div>
          </div>
          <Button onClick={handleLimitsSave} disabled={pending} size="sm">
            Guardar límites
          </Button>
          {limitsMsg && (
            <p className="text-xs text-muted-foreground">{limitsMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Trial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Extender trial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={trialDate}
              onChange={(e) => setTrialDate(e.target.value)}
              className="w-full sm:w-48"
            />
            <Button onClick={handleTrialSave} disabled={pending || !trialDate} size="sm">
              Guardar fecha
            </Button>
          </div>
          {trialMsg && (
            <p className="text-xs text-muted-foreground">{trialMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Billing info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Información de billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>
            <span className="text-muted-foreground">Suscripción MP: </span>
            {store.mp_subscription_id ?? '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Inicio período: </span>
            {store.current_period_start
              ? new Date(store.current_period_start).toLocaleDateString('es-AR')
              : '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Fin período: </span>
            {store.current_period_end
              ? new Date(store.current_period_end).toLocaleDateString('es-AR')
              : '—'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
