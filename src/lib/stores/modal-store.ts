import { create } from 'zustand'

interface ModalStore {
  activeModal: string | null
  modalData: unknown
  open: (name: string, data?: unknown) => void
  close: () => void
}

export const useModalStore = create<ModalStore>((set) => ({
  activeModal: null,
  modalData: null,
  open: (name, data = null) => set({ activeModal: name, modalData: data }),
  close: () => set({ activeModal: null, modalData: null }),
}))
