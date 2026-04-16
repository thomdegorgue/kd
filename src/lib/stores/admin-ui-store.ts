import { create } from 'zustand'

type AdminUIState = {
  sidebarMobileOpen: boolean
  openSidebarMobile: () => void
  closeSidebarMobile: () => void
  toggleSidebarMobile: () => void
}

export const useAdminUIStore = create<AdminUIState>((set) => ({
  sidebarMobileOpen: false,
  openSidebarMobile: () => set({ sidebarMobileOpen: true }),
  closeSidebarMobile: () => set({ sidebarMobileOpen: false }),
  toggleSidebarMobile: () => set((s) => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
}))
