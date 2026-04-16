import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  price: number // centavos
  quantity: number
  imageUrl: string | null
  variantLabel?: string
}

interface CartStore {
  storeId: string | null
  items: CartItem[]
  setStoreId: (storeId: string) => void
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string, variantLabel?: string) => void
  updateQuantity: (productId: string, quantity: number, variantLabel?: string) => void
  clearCart: () => void
}

function itemKey(productId: string, variantLabel?: string): string {
  return variantLabel ? `${productId}::${variantLabel}` : productId
}

function getKey(item: CartItem): string {
  return itemKey(item.productId, item.variantLabel)
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      storeId: null,
      items: [],

      setStoreId: (storeId) =>
        set((state) => {
          // Si cambia de tienda, limpiar carrito
          if (state.storeId && state.storeId !== storeId) {
            return { storeId, items: [] }
          }
          return { storeId }
        }),

      addItem: (item) =>
        set((state) => {
          const key = itemKey(item.productId, item.variantLabel)
          const existing = state.items.find((i) => getKey(i) === key)
          if (existing) {
            return {
              items: state.items.map((i) =>
                getKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: 1 }] }
        }),

      removeItem: (productId, variantLabel) =>
        set((state) => ({
          items: state.items.filter((i) => getKey(i) !== itemKey(productId, variantLabel)),
        })),

      updateQuantity: (productId, quantity, variantLabel) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => getKey(i) !== itemKey(productId, variantLabel)) }
          }
          return {
            items: state.items.map((i) =>
              getKey(i) === itemKey(productId, variantLabel) ? { ...i, quantity } : i,
            ),
          }
        }),

      clearCart: () => set({ items: [] }),
    }),
    { name: 'kd-cart' },
  ),
)

// Selectores derivados
export function useCartItemCount(): number {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
}

export function useCartTotal(): number {
  return useCartStore((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0))
}
