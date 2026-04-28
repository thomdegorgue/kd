'use client'

import Image from 'next/image'
import { Clock, MapPin, Search, ShoppingCart } from 'lucide-react'
import { useStore } from '@/components/public/store-context'
import { useCartItemCount } from '@/lib/stores/cart-store'

interface CatalogHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onCartClick: () => void
}

export function CatalogHeader({ searchQuery, onSearchChange, onCartClick }: CatalogHeaderProps) {
  const store = useStore()
  const cartCount = useCartItemCount()
  const brand = store.config?.primary_color ?? '#0f0f0f'
  const city = store.config?.city
  const hours = store.config?.hours

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-xs">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {store.logo_url ? (
            <Image
              src={store.logo_url}
              alt={store.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: brand }}
            >
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{store.name}</p>
            {(city || hours) && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {city && (
                  <span className="flex items-center gap-0.5 truncate">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {city}
                  </span>
                )}
                {hours && (
                  <span className="flex items-center gap-0.5 truncate">
                    <Clock className="h-2.5 w-2.5 shrink-0" />
                    {hours}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 flex-1 max-w-56">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar productos..."
            className="bg-transparent text-xs outline-none w-full placeholder:text-muted-foreground"
          />
        </div>

        <button
          type="button"
          onClick={onCartClick}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: brand }}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Carrito</span>
          {cartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] flex items-center justify-center font-bold border border-background text-white"
              style={{ background: brand }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Search móvil */}
      <div className="sm:hidden max-w-3xl mx-auto px-4 pb-3">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar productos..."
            className="bg-transparent text-xs outline-none w-full placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </header>
  )
}
