'use client'

import Link from 'next/link'
import { AlertTriangle, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getPackForModule, getModuleSyncWarning } from '@/lib/billing/synchronies'
import type { ModuleName } from '@/lib/types'

export function PackInactiveWarning({
  requiredModule,
  activeModules,
}: {
  requiredModule: ModuleName
  activeModules: Record<ModuleName, boolean>
}) {
  // Verificar si el módulo requerido está activo
  if (activeModules[requiredModule]) return null

  const pack = getPackForModule(requiredModule)
  if (!pack) return null

  const warning = getModuleSyncWarning(requiredModule, [requiredModule])
  if (!warning) return null

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-sm text-amber-800">
        <p className="mb-2">{warning}</p>
        <Link
          href="/admin/billing"
          className="inline-flex items-center gap-1.5 font-semibold text-amber-700 hover:text-amber-900 transition-colors"
        >
          <Zap className="h-3.5 w-3.5" />
          Activar {pack.label}
        </Link>
      </AlertDescription>
    </Alert>
  )
}
