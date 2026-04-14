'use client'

import type { ModuleName } from '@/lib/types'
import { PlanUpgradePrompt } from './plan-upgrade-prompt'

interface ModuleGateProps {
  module: ModuleName
  activeModules: Partial<Record<ModuleName, boolean>>
  children: React.ReactNode
  /** Mostrar prompt de upgrade en lugar de null cuando el módulo está inactivo */
  showUpgradePrompt?: boolean
}

/**
 * Bloquea el render de children si el módulo está inactivo.
 * Nunca hace 404 — muestra el prompt de upgrade o null.
 */
export function ModuleGate({
  module,
  activeModules,
  children,
  showUpgradePrompt = true,
}: ModuleGateProps) {
  const isActive = activeModules[module] === true

  if (!isActive) {
    return showUpgradePrompt ? <PlanUpgradePrompt module={module} /> : null
  }

  return <>{children}</>
}
