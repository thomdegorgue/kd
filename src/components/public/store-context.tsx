'use client'

import { createContext, useContext } from 'react'
import type { StorePublic } from '@/lib/db/queries/stores'

const StoreCtx = createContext<StorePublic | null>(null)

export function StoreProvider({
  store,
  children,
}: {
  store: StorePublic
  children: React.ReactNode
}) {
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}

export function useStore(): StorePublic {
  const store = useContext(StoreCtx)
  if (!store) throw new Error('useStore debe usarse dentro de StoreProvider')
  return store
}
