import { getPackByModule } from '@/lib/billing/packs'
import type { ModuleName } from '@/lib/types'
import type { Pack, PackId } from '@/lib/billing/packs'

// Dependencias de módulos: si X está activo, Y también debería estarlo
export const MODULE_DEPENDENCIES: Partial<Record<ModuleName, ModuleName[]>> = {
  // Si finance está activo, expenses le alimenta datos
  finance: ['expenses'] as ModuleName[],
  // Si savings_account está activo, finance debería estar para registrar movimientos
  savings_account: ['finance'] as ModuleName[],
  // Si wholesale está activo, variants lo soporta (precios por variante)
  wholesale: ['variants'] as ModuleName[],
  // Si multiuser está activo, tasks lo usa (asignar a miembros)
  multiuser: ['tasks'] as ModuleName[],
}

/**
 * Retorna qué módulos X necesita para funcionar óptimamente.
 * Ej: si 'finance' está OFF pero 'savings_account' está ON, retorna ['finance'].
 */
export function getMissingDependencies(
  module: ModuleName,
  activeModules: Record<ModuleName, boolean>,
): ModuleName[] {
  const deps = MODULE_DEPENDENCIES[module] ?? []
  return deps.filter(m => !activeModules[m])
}

/**
 * Retorna qué pack contiene a un módulo.
 */
export function getPackForModule(module: ModuleName): Pack | undefined {
  return getPackByModule(module)
}

/**
 * Retorna warning descriptivo si un módulo necesario está OFF.
 */
export function getModuleSyncWarning(
  module: ModuleName,
  missingDeps: ModuleName[],
): string | null {
  if (missingDeps.length === 0) return null

  switch (module) {
    case 'finance':
      return `El módulo "Finanzas" obtiene movimientos automáticos de Gastos. Activá ambos para una vista integral.`
    case 'savings_account':
      return `Necesitás "Finanzas Pro" para que los movimientos de ahorro se registren correctamente en caja.`
    case 'wholesale':
      return `Los precios mayoristas funcionan mejor con "Variantes Pro". Considerá activar ambos.`
    case 'multiuser':
      return `El módulo "Equipo Pro" incluye tareas. Activá ambos para asignar trabajo a colaboradores.`
    default:
      return null
  }
}

/**
 * Retorna lista de packs recomendados para activar si el usuario activa un módulo.
 * Ej: si activa 'savings_account' pero no tiene 'finance', sugiere activar 'finance' pack.
 */
export function getRecommendedPacksForModule(module: ModuleName): PackId[] {
  const deps = MODULE_DEPENDENCIES[module] ?? []
  const depPacks = new Set<PackId>()

  for (const dep of deps) {
    const pack = getPackForModule(dep)
    if (pack && pack.id !== 'core') {
      depPacks.add(pack.id)
    }
  }

  return Array.from(depPacks)
}
