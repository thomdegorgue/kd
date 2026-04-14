'use client'

import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ModuleName } from '@/lib/types'

interface PlanUpgradePromptProps {
  module: ModuleName
  className?: string
}

const MODULE_LABELS: Partial<Record<ModuleName, string>> = {
  stock: 'Control de stock',
  variants: 'Variantes de producto',
  wholesale: 'Precios mayoristas',
  shipping: 'Envíos con seguimiento',
  finance: 'Finanzas',
  banners: 'Banners y portada',
  social: 'Links de redes sociales',
  product_page: 'Página de producto',
  multiuser: 'Múltiples usuarios',
  custom_domain: 'Dominio personalizado',
  tasks: 'Tareas',
  savings_account: 'Caja de ahorro',
  expenses: 'Gastos',
  assistant: 'Asistente IA',
}

export function PlanUpgradePrompt({ module, className }: PlanUpgradePromptProps) {
  const label = MODULE_LABELS[module] ?? module

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-base">Módulo no disponible</CardTitle>
        <CardDescription>
          <strong>{label}</strong> no está incluido en tu plan actual.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button size="sm" onClick={() => { window.location.href = '/admin/billing' }}>
          Actualizar plan
        </Button>
      </CardContent>
    </Card>
  )
}
