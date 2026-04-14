import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ColorPreset = {
  name: string
  primary: string
  secondary: string
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'KitDigital',  primary: '#1b1b1b', secondary: '#f6f6f6' },
  { name: 'Índigo',      primary: '#4f46e5', secondary: '#eef2ff' },
  { name: 'Esmeralda',   primary: '#059669', secondary: '#ecfdf5' },
  { name: 'Ámbar',       primary: '#d97706', secondary: '#fffbeb' },
  { name: 'Rosa',        primary: '#db2777', secondary: '#fdf2f8' },
  { name: 'Cielo',       primary: '#0284c7', secondary: '#f0f9ff' },
  { name: 'Violeta',     primary: '#7c3aed', secondary: '#f5f3ff' },
  { name: 'Coral',       primary: '#e11d48', secondary: '#fff1f2' },
]

export type ModuleKey =
  | 'banners' | 'product_page' | 'categories'
  | 'stock' | 'variants' | 'wholesale' | 'shipping'
  | 'finance' | 'expenses' | 'savings' | 'tasks'
  | 'multiuser' | 'custom_domain' | 'payments' | 'social' | 'assistant'

interface DesignState {
  storeName: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  modules: Record<ModuleKey, boolean>

  setStoreName: (name: string) => void
  setLogoUrl: (url: string) => void
  setPrimaryColor: (color: string) => void
  setSecondaryColor: (color: string) => void
  applyPreset: (preset: ColorPreset) => void
  toggleModule: (key: ModuleKey) => void
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set) => ({
      storeName: 'Mi Tienda',
      logoUrl: '/logo.jpg',
      primaryColor: '#1b1b1b',
      secondaryColor: '#f6f6f6',

      modules: {
        banners:       true,
        product_page:  true,
        categories:    true,
        stock:         true,
        variants:      true,
        wholesale:     true,
        shipping:      true,
        finance:       true,
        expenses:      true,
        savings:       true,
        tasks:         true,
        multiuser:     true,
        custom_domain: true,
        payments:      true,
        social:        true,
        assistant:     true,
      },

      setStoreName:    (name)  => set({ storeName: name }),
      setLogoUrl:      (url)   => set({ logoUrl: url }),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setSecondaryColor:(color) => set({ secondaryColor: color }),
      applyPreset:     (preset) => set({ primaryColor: preset.primary, secondaryColor: preset.secondary }),
      toggleModule:    (key)   => set((state) => ({
        modules: { ...state.modules, [key]: !state.modules[key] },
      })),
    }),
    { name: 'kd-design-store' }
  )
)
