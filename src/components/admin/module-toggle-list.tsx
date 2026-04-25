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
}

const ALL_MODULES: ModuleInfo[] = [
  { id: 'catalog', label: 'Catálogo', description: 'Configuración pública de la tienda', tier: 'core' },
  { id: 'products', label: 'Productos', description: 'CRUD de productos', tier: 'core' },
  { id: 'categories', label: 'Categorías', description: 'Agrupación de productos', tier: 'core' },
  { id: 'cart', label: 'Carrito', description: 'Carrito de compras + WhatsApp', tier: 'core' },
  { id: 'orders', label: 'Pedidos', description: 'Gestión de pedidos', tier: 'core' },
  { id: 'stock', label: 'Stock', description: 'Control de inventario', tier: 'base' },
  { id: 'payments', label: 'Pagos', description: 'Registro de cobros', tier: 'base' },
  { id: 'banners', label: 'Banners', description: 'Carrusel de imágenes', tier: 'base' },
  { id: 'social', label: 'Redes sociales', description: 'Links en el footer', tier: 'base' },
  { id: 'product_page', label: 'Página de producto', description: 'Detalle extendido', tier: 'base' },
  { id: 'shipping', label: 'Envíos', description: 'Métodos de envío + tracking', tier: 'base' },
  { id: 'variants', label: 'Variantes', description: 'Talles, colores, etc.', tier: 'pro' },
  { id: 'wholesale', label: 'Mayorista', description: 'Precios mayoristas', tier: 'pro' },
  { id: 'finance', label: 'Finanzas', description: 'Flujo de caja', tier: 'pro' },
  { id: 'expenses', label: 'Gastos', description: 'Egresos detallados', tier: 'pro' },
  { id: 'savings_account', label: 'Ahorros', description: 'Cuentas de ahorro virtuales', tier: 'pro' },
  { id: 'multiuser', label: 'Equipo', description: 'Múltiples usuarios', tier: 'pro' },
  { id: 'custom_domain', label: 'Dominio propio', description: 'Tu dominio personalizado', tier: 'base' },
  { id: 'tasks', label: 'Tareas', description: 'Lista de tareas del negocio', tier: 'pro' },
  { id: 'assistant', label: 'Asistente IA', description: 'Asistente inteligente', tier: 'pro' },
]

const TIER_LABELS: Record<string, string> = {
  core: 'Core — siempre activos',
  base: 'Base — incluidos en el plan',
  pro: 'Pro — add-on mensual',
}

const TIER_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  core: 'default',
  base: 'secondary',
  pro: 'outline',
}

export function ModuleToggleList() {
  const { modules, user_role, billing_status } = useAdminContext()
  const toggleMutation = useToggleModule()
  const isOwner = user_role === 'owner'
  const hasActiveSub = billing_status === 'active'

  const grouped = {
    core: ALL_MODULES.filter((m) => m.tier === 'core'),
    base: ALL_MODULES.filter((m) => m.tier === 'base'),
    pro: ALL_MODULES.filter((m) => m.tier === 'pro'),
  }

  return (
    <div className="space-y-8">
      {(Object.entries(grouped) as [string, ModuleInfo[]][]).map(([tier, mods]) => (
        <div key={tier}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            {TIER_LABELS[tier]}
            <Badge variant={TIER_VARIANTS[tier]}>{mods.length}</Badge>
          </h3>
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
                        {isPro && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            Pro
                          </Badge>
                        )}
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
      ))}
    </div>
  )
}
