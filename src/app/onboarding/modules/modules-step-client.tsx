'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Loader2, Check, Package, CreditCard, Image, Share2, FileText, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { onboardingStepModules } from '@/lib/actions/onboarding'
import { OnboardingSteps } from '../_components/onboarding-steps'
import type { ActionResult } from '@/lib/types'

type ModuleOption = {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  defaultOn: boolean
}

const OPTIONAL_MODULES: ModuleOption[] = [
  { id: 'stock', label: 'Control de stock', description: 'Controlá el inventario de tus productos', icon: Package, defaultOn: false },
  { id: 'payments', label: 'Registro de pagos', description: 'Registrá cobros y métodos de pago', icon: CreditCard, defaultOn: true },
  { id: 'banners', label: 'Banners', description: 'Mostrá imágenes destacadas en el catálogo', icon: Image, defaultOn: false },
  { id: 'social', label: 'Redes sociales', description: 'Links a Instagram, Facebook y TikTok', icon: Share2, defaultOn: true },
  { id: 'product_page', label: 'Página de producto', description: 'Detalle extendido para cada producto', icon: FileText, defaultOn: true },
  { id: 'shipping', label: 'Envíos y tracking', description: 'Métodos de envío y seguimiento de pedidos', icon: Truck, defaultOn: false },
]

const CORE_MODULES = [
  { label: 'Catálogo', description: 'Tu tienda pública siempre activa' },
  { label: 'Productos', description: 'Agregar y gestionar productos' },
  { label: 'Categorías', description: 'Organizar productos en grupos' },
  { label: 'Carrito + WhatsApp', description: 'Pedidos por WhatsApp' },
  { label: 'Gestión de pedidos', description: 'Ver y actualizar el estado de pedidos' },
]

export function ModulesStepClient({
  storeId: _storeId,
  initialModules,
}: {
  storeId: string
  initialModules: Record<string, boolean>
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(onboardingStepModules, null)

  const getDefault = (mod: ModuleOption) =>
    mod.id in initialModules ? initialModules[mod.id] : mod.defaultOn

  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(OPTIONAL_MODULES.map((m) => [m.id, getDefault(m)]))
  )

  function toggle(id: string) {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      <OnboardingSteps current={2} />

      <Card>
        <CardHeader>
          <CardTitle>¿Qué necesitás?</CardTitle>
          <CardDescription>
            Activá solo lo que uses. Podés cambiar esto después cuando quieras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-6">
            {state && !state.success && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {state.error.message}
              </p>
            )}

            {/* Hidden inputs for selected modules */}
            {OPTIONAL_MODULES.filter((m) => enabled[m.id]).map((m) => (
              <input key={m.id} type="hidden" name={m.id} value="on" />
            ))}

            {/* Core modules — always on */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Incluidos siempre
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CORE_MODULES.map((mod) => (
                  <div
                    key={mod.label}
                    className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                      <Check className="h-3 w-3" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none">{mod.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional modules — toggleable */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Opcionales
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {OPTIONAL_MODULES.map((mod) => {
                  const isOn = enabled[mod.id]
                  const Icon = mod.icon
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggle(mod.id)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                        isOn
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 transition-colors ${
                          isOn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isOn ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">{mod.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{mod.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <Button render={<Link href="/onboarding/payment" />} variant="ghost" className="flex-1">
                Omitir
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
