'use client'

import { createContext, useContext } from 'react'
import type { StoreContext } from '@/lib/types'

export const AdminContext = createContext<StoreContext | null>(null)

/**
 * Accede al StoreContext en cualquier componente client dentro del admin.
 * El AdminShell provee este contexto desde el layout server.
 */
export function useAdminContext(): StoreContext {
  const ctx = useContext(AdminContext)
  if (!ctx) {
    throw new Error('useAdminContext debe usarse dentro de AdminShell')
  }
  return ctx
}
