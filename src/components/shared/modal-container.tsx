'use client'

import { useModalStore } from '@/lib/stores/modal-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ModalConfig = {
  title: string
  component: React.ComponentType<{ data: unknown; close: () => void }>
}

/**
 * Registry de modales. Cada módulo registra sus modales aquí.
 * Ejemplo: MODAL_REGISTRY['delete-product'] = { title: 'Eliminar producto', component: DeleteProductModal }
 */
export const MODAL_REGISTRY: Record<string, ModalConfig> = {}

/**
 * Renderiza el modal activo según el store.
 * Montar una sola vez en el layout raíz o providers.
 */
export function ModalContainer() {
  const { activeModal, modalData, close } = useModalStore()

  if (!activeModal) return null

  const config = MODAL_REGISTRY[activeModal]

  if (!config) return null

  const ModalComponent = config.component

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>
        <ModalComponent data={modalData} close={close} />
      </DialogContent>
    </Dialog>
  )
}
