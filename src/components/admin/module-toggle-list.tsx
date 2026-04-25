'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { useToggleModule } from '@/lib/hooks/use-modules'
import { CORE_MODULES } from '@/lib/validations/module'
import type { ModuleName } from '@/lib/types'

type ModuleInfo = {
  id: ModuleName
  label: string
  description: string
  tier: 'core' | 'base' | 'pro'
  group:
    | 'catalog_sales'
    | 'operations'
    | 'team'
    | 'commercial'
    | 'finance'
    | 'domain'
    | 'ai'
}

const ALL_MODULES: ModuleInfo[] = [
  { id: 'catalog', label: 'Catálogo', description: 'Configuración pública de la tienda', tier: 'core', group: 'catalog_sales' },
  { id: 'products', label: 'Productos', description: 'CRUD de productos', tier: 'core', group: 'catalog_sales' },
  { id: 'categories', label: 'Categorías', description: 'Agrupación de productos', tier: 'core', group: 'catalog_sales' },
  { id: 'cart', label: 'Carrito', description: 'Carrito de compras + WhatsApp', tier: 'core', group: 'catalog_sales' },
  { id: 'orders', label: 'Pedidos', description: 'Gestión de pedidos', tier: 'core', group: 'catalog_sales' },
  { id: 'banners', label: 'Banners', description: 'Carrusel de imágenes', tier: 'base', group: 'commercial' },
  { id: 'social', label: 'Redes sociales', description: 'Links en el footer', tier: 'base', group: 'commercial' },
  { id: 'product_page', label: 'Página de producto', description: 'Detalle extendido', tier: 'base', group: 'commercial' },
  { id: 'shipping', label: 'Envíos', description: 'Métodos de envío + tracking', tier: 'base', group: 'operations' },
  { id: 'stock', label: 'Stock', description: 'Control de inventario', tier: 'base', group: 'operations' },
  { id: 'payments', label: 'Pagos', description: 'Registro de cobros', tier: 'base', group: 'catalog_sales' },
  { id: 'variants', label: 'Variantes', description: 'Talles, colores, etc.', tier: 'pro', group: 'operations' },
  { id: 'tasks', label: 'Tareas', description: 'Lista de tareas del negocio', tier: 'pro', group: 'team' },
  { id: 'multiuser', label: 'Equipo', description: 'Múltiples usuarios', tier: 'pro', group: 'team' },
  { id: 'wholesale', label: 'Mayorista', description: 'Precios mayoristas', tier: 'pro', group: 'commercial' },
  { id: 'finance', label: 'Finanzas', description: 'Flujo de caja', tier: 'pro', group: 'finance' },
  { id: 'expenses', label: 'Gastos', description: 'Egresos detallados', tier: 'pro', group: 'finance' },
  { id: 'savings_account', label: 'Ahorros', description: 'Cuentas de ahorro virtuales', tier: 'pro', group: 'finance' },
  { id: 'custom_domain', label: 'Dominio propio', description: 'Tu dominio personalizado', tier: 'base', group: 'domain' },
  { id: 'assistant', label: 'Asistente IA', description: 'Asistente inteligente', tier: 'pro', group: 'ai' },
]

const GROUPS: Array<{ id: ModuleInfo['group']; label: string; description: string }> = [
  { id: 'catalog_sales', label: 'Catálogo y Ventas', description: 'Tu tienda pública y la gestión de pedidos.' },
  { id: 'operations', label: 'Operaciones', description: 'Stock, envíos y variantes para operar mejor.' },
  { id: 'team', label: 'Equipo', description: 'Roles, colaboradores y tareas.' },
  { id: 'commercial', label: 'Comercial', description: 'Banners, redes, mayorista y más conversión.' },
  { id: 'finance', label: 'Finanzas', description: 'Caja, gastos y ahorro.' },
  { id: 'domain', label: 'Dominio', description: 'Dominio propio para tu marca.' },
  { id: 'ai', label: 'IA', description: 'Automatizaciones y asistencia inteligente.' },
]

function TierPill({ tier }: { tier: ModuleInfo['tier'] }) {
  if (tier === 'core') return <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">Incluido</Badge>
  if (tier === 'base') return <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Base</Badge>
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Pro</Badge>
}

export function ModuleToggleList() {
  const { modules, user_role, billing_status } = useAdminContext()
  const toggleMutation = useToggleModule()
  const isOwner = user_role === 'owner'
  const hasActiveSub = billing_status === 'active'

  const byGroup = new Map<ModuleInfo['group'], ModuleInfo[]>()
  for (const g of GROUPS) byGroup.set(g.id, [])
  for (const m of ALL_MODULES) byGroup.get(m.group)?.push(m)

  return (
    <div className="space-y-8">
      {GROUPS.map((g) => {
        const mods = byGroup.get(g.id) ?? []
        if (mods.length === 0) return null
        return (
          <div key={g.id}>
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{g.label}</h3>
                <Badge variant="secondary">{mods.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
            </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mods.map((mod) => {
              const isCore = CORE_MODULES.includes(mod.id)
              const isPro = mod.tier === 'pro'
              const isEnabled = isCore || modules[mod.id] === true
              const proLocked = isPro && !hasActiveSub

              return (
                <Card key={mod.id} className={proLocked ? 'opacity-60' : undefined}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{mod.label}</p>
                        <TierPill tier={mod.tier} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                      {proLocked && (
                        <Link
                          href="/admin/billing"
                          className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline"
                        >
                          <Zap className="h-3 w-3" />
                          Activar en Billing
                        </Link>
                      )}
                    </div>
                    <Switch
                      checked={isEnabled}
                      disabled={isCore || !isOwner || proLocked || toggleMutation.isPending}
                      onCheckedChange={(checked) => {
                        toggleMutation.mutate({ module: mod.id, enabled: checked })
                      }}
                    />
                  </CardContent>
                </Card>
              )
            })}
          </div>
          </div>
        )
      })}
    </div>
  )
}
