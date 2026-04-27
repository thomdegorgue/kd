'use client'

import { useEffect } from 'react'

/**
 * Bloquea la navegación del browser cuando hay cambios sin guardar.
 * Muestra el dialog nativo "¿Abandonar los cambios?" al recargar o cerrar tab.
 * No bloquea next/navigation — para eso usar el `open` prop del Sheet.
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
