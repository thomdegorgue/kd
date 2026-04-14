'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDesignStore } from '@/lib/stores/design-store'
import { StoreThemeProvider } from '@/components/shared/store-theme-provider'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ShoppingCart, Package, Search, Star, Truck, Shield, RotateCcw,
  MapPin, Clock, ChevronLeft, ChevronRight, Plus, Minus, X,
  MessageCircle, ArrowLeft, Shirt, Footprints, Briefcase, Tag, Globe, Camera,
} from 'lucide-react'
import Image from 'next/image'

// ── Datos de muestra ──────────────────────────────────────────────────────────

const BANNERS = [
  { title: 'Nueva colección',     subtitle: 'Piezas seleccionadas para esta temporada', badge: 'NUEVO',       cta: 'Ver colección' },
  { title: 'Envío gratis',        subtitle: 'En compras mayores a $15.000 — todo el país', badge: 'PROMO',    cta: 'Aprovechar' },
  { title: 'Más de 50 productos', subtitle: 'Explorá todo el catálogo y encontrá tu estilo', badge: 'VER TODO', cta: 'Explorar' },
]

const CATEGORIES = ['Todo', 'Ropa', 'Accesorios', 'Calzado']

type Product = {
  id: number; name: string; price: number; comparePrice?: number
  cat: string; desc: string; stock: number; rating: number; Icon: React.ElementType
}

const PRODUCTS: Product[] = [
  { id: 1, name: 'Remera básica',    price: 4500,  comparePrice: 6000, cat: 'Ropa',       desc: 'Remera 100% algodón, corte recto. Disponible en blanco y negro. Lavado a máquina.',         stock: 12, rating: 4.8, Icon: Shirt     },
  { id: 2, name: 'Pantalón cargo',   price: 12000, cat: 'Ropa',        desc: 'Pantalón con bolsillos laterales y cierre con botón. Tela ripstop resistente al agua.',       stock: 8,  rating: 4.6, Icon: Shirt     },
  { id: 3, name: 'Gorra snapback',   price: 6800,  cat: 'Accesorios',  desc: 'Gorra de 6 paneles con cierre snapback ajustable. Bordado de alta calidad.',                 stock: 25, rating: 4.9, Icon: Briefcase },
  { id: 4, name: 'Zapatillas urban', price: 28000, comparePrice:32000, cat: 'Calzado',    desc: 'Zapatillas urbanas con suela de goma vulcanizada. Capellada de cuero ecológico.',           stock: 4,  rating: 4.7, Icon: Footprints},
  { id: 5, name: 'Buzo hoodie',      price: 15500, cat: 'Ropa',        desc: 'Buzo con capucha y bolsillo canguro. Interior afelpado, cálido y suave.',                     stock: 6,  rating: 4.5, Icon: Shirt     },
  { id: 6, name: 'Riñonera',         price: 8900,  cat: 'Accesorios',  desc: 'Riñonera con múltiples bolsillos y correa ajustable. Cierre con cremallera YKK.',             stock: 0,  rating: 4.3, Icon: Briefcase },
]

const VARIANT_COLORS  = ['#1b1b1b', '#e5e5e5', '#2563eb', '#dc2626', '#16a34a']
const VARIANT_SIZES   = ['XS', 'S', 'M', 'L', 'XL']

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return `$${n.toLocaleString('es-AR')}` }

// ── Componente principal ──────────────────────────────────────────────────────

export function VitrinePreview() {
  const { storeName, logoUrl, primaryColor, secondaryColor, modules } = useDesignStore()

  const [cart,            setCart]           = useState<Record<number, number>>({})
  const [cartOpen,        setCartOpen]       = useState(false)
  const [selected,        setSelected]       = useState<Product | null>(null)
  const [slide,           setSlide]          = useState(0)
  const [paused,          setPaused]         = useState(false)
  const [activeCategory,  setActiveCategory] = useState('Todo')
  const [searchQuery,     setSearchQuery]    = useState('')
  const [selectedColor,   setSelectedColor]  = useState(0)
  const [selectedSize,    setSelectedSize]   = useState(2)
  const [detailQty,       setDetailQty]      = useState(1)

  // Carousel auto-advance
  useEffect(() => {
    if (paused || !modules.banners) return
    const id = setInterval(() => setSlide(s => (s + 1) % BANNERS.length), 4500)
    return () => clearInterval(id)
  }, [paused, modules.banners])

  const prevSlide = useCallback(() => setSlide(s => (s - 1 + BANNERS.length) % BANNERS.length), [])
  const nextSlide = useCallback(() => setSlide(s => (s + 1) % BANNERS.length), [])

  const addToCart     = (id: number) => setCart(c => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
  const removeFromCart = (id: number) => setCart(c => { const n = { ...c }; if (n[id] > 1) n[id]-- ; else delete n[id]; return n })

  const filtered     = PRODUCTS
    .filter(p => activeCategory === 'Todo' || p.cat === activeCategory)
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const cartItems    = PRODUCTS.filter(p => cart[p.id])
  const cartTotal    = cartItems.reduce((s, p) => s + p.price * (cart[p.id] ?? 0), 0)
  const cartCount    = Object.values(cart).reduce((s, n) => s + n, 0)

  function openProduct(p: Product) {
    if (!modules.product_page) { addToCart(p.id); return }
    setSelected(p); setDetailQty(1); setSelectedColor(0); setSelectedSize(2)
  }

  return (
    <StoreThemeProvider primaryColor={primaryColor} secondaryColor={secondaryColor} className="min-h-screen bg-[#f6f6f6]">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-border shadow-xs">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-1">
            {logoUrl ? (
              <Image src={logoUrl} alt={storeName} width={32} height={32} className="rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: primaryColor }}>
                {storeName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight">{storeName || 'Mi Tienda'}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />Buenos Aires</span>
                <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />Lun–Sáb 9–18hs</span>
              </div>
            </div>
          </div>
          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 flex-1 max-w-48">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              className="bg-transparent text-xs outline-none w-full placeholder:text-muted-foreground"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Cart */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: primaryColor }}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-2xs flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 space-y-0">

        {/* ── BANNER / HEADER ── */}
        {!modules.banners && (
          <div className="rounded-b-2xl px-8 py-10 flex items-center" style={{ background: `${primaryColor}10` }}>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: primaryColor, opacity: 0.6 }}>Bienvenido a</p>
              <h2 className="text-2xl font-semibold leading-tight" style={{ color: primaryColor }}>{storeName || 'Mi Tienda'}</h2>
              <p className="text-sm text-muted-foreground">Explorá nuestro catálogo y pedí por WhatsApp</p>
            </div>
          </div>
        )}
        {modules.banners && (
          <div
            className="relative overflow-hidden rounded-b-2xl"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Slides */}
            <div className="relative h-52 overflow-hidden" style={{ background: primaryColor }}>
              {/* Decoración */}
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/8 pointer-events-none" />
              <div className="absolute -left-12 -bottom-16 h-52 w-52 rounded-full bg-white/6 pointer-events-none" />
              <div className="absolute right-1/4 top-4 h-24 w-24 rounded-full bg-white/4 pointer-events-none" />

              {/* Slide content — fade-in on change */}
              <div key={slide} className="absolute inset-0 flex items-center px-8 animate-fade-in">
                <div className="space-y-2 max-w-sm">
                  <span
                    className="inline-block text-2xs font-semibold tracking-widest uppercase px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}
                  >
                    {BANNERS[slide].badge}
                  </span>
                  <h2 className="text-2xl font-semibold text-white leading-tight">
                    {BANNERS[slide].title}
                  </h2>
                  <p className="text-sm text-white/75">{BANNERS[slide].subtitle}</p>
                  <button
                    className="mt-2 text-xs font-semibold px-4 py-1.5 rounded-full transition-opacity hover:opacity-90"
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}
                  >
                    {BANNERS[slide].cta} →
                  </button>
                </div>
              </div>

              {/* Prev / Next */}
              <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/35 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/35 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {BANNERS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className="rounded-full transition-all"
                  style={{
                    height: 6, width: i === slide ? 18 : 6,
                    background: i === slide ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── CATEGORÍAS ── */}
        {modules.categories && (
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0"
                style={
                  activeCategory === cat
                    ? { background: primaryColor, color: '#fff' }
                    : { background: secondaryColor, color: primaryColor, border: `1px solid ${primaryColor}20` }
                }
              >
                {cat}
                <span className="ml-1 opacity-60">
                  ({cat === 'Todo' ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === cat).length})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── TRUST BADGES ── */}
        <div className="grid grid-cols-3 gap-2 py-2">
          {[
            { icon: Truck,    label: 'Envío en 24–48hs' },
            { icon: Shield,   label: 'Compra segura'    },
            { icon: RotateCcw,label: 'Cambio sin costo' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 text-center bg-white rounded-xl py-3 border border-border">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xs text-muted-foreground leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* ── GRILLA DE PRODUCTOS ── */}
        <div className="pb-8">
          {activeCategory !== 'Todo' && (
            <div className="flex items-center gap-2 mb-4 py-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{activeCategory}</span>
              <span className="text-xs text-muted-foreground">— {filtered.length} productos</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((p, index) => {
              const qty = cart[p.id] ?? 0
              return (
                <div
                  key={p.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-border hover:border-foreground/20 hover:shadow-md transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                >
                  {/* Imagen placeholder */}
                  <div
                    className="relative aspect-square cursor-pointer overflow-hidden"
                    style={{ background: secondaryColor }}
                    onClick={() => openProduct(p)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p.Icon className="h-16 w-16 transition-transform group-hover:scale-105 duration-200" style={{ color: primaryColor, opacity: 0.18 }} />
                    </div>
                    {/* Product page overlay (when module is ON) */}
                    {modules.product_page && p.stock !== 0 && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
                          Ver detalle →
                        </span>
                      </div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {p.comparePrice && (
                        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-red-500 text-white">
                          -{Math.round((1 - p.price / p.comparePrice) * 100)}%
                        </span>
                      )}
                      {p.stock === 0 && (
                        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Sin stock</span>
                      )}
                      {modules.stock && p.stock > 0 && p.stock <= 5 && (
                        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-warning/15 text-warning">Quedan {p.stock}</span>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="text-xs font-medium leading-tight line-clamp-2 cursor-pointer hover:underline" onClick={() => openProduct(p)}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                        <span className="text-2xs text-muted-foreground">{p.rating}</span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold" style={{ color: primaryColor }}>{fmt(p.price)}</span>
                      {p.comparePrice && (
                        <span className="text-2xs text-muted-foreground line-through">{fmt(p.comparePrice)}</span>
                      )}
                    </div>

                    {/* Quantity selector / Agregar */}
                    {p.stock === 0 ? (
                      <button className="w-full h-9 rounded-xl text-xs font-medium bg-muted text-muted-foreground cursor-not-allowed">
                        Sin stock
                      </button>
                    ) : qty === 0 ? (
                      <button
                        onClick={() => addToCart(p.id)}
                        className="w-full h-9 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: primaryColor }}
                      >
                        Agregar al carrito
                      </button>
                    ) : (
                      <div className="flex items-stretch h-9 rounded-xl overflow-hidden border-2" style={{ borderColor: primaryColor }}>
                        <button
                          onClick={() => removeFromCart(p.id)}
                          className="w-9 flex items-center justify-center shrink-0 transition-colors hover:bg-muted/40"
                        >
                          <Minus className="h-3 w-3" style={{ color: primaryColor }} />
                        </button>
                        <span className="flex-1 flex items-center justify-center text-xs font-bold" style={{ color: primaryColor }}>{qty}</span>
                        <button
                          onClick={() => addToCart(p.id)}
                          className="w-9 flex items-center justify-center shrink-0 text-white transition-opacity hover:opacity-90"
                          style={{ background: primaryColor }}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="border-t border-border py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <Image src={logoUrl} alt={storeName} width={24} height={24} className="rounded object-cover" />
              ) : (
                <div className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white" style={{ background: primaryColor }}>
                  {storeName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold">{storeName}</span>
            </div>
            {modules.social && (
              <div className="flex items-center gap-2">
                {[
                  { Icon: MessageCircle, label: 'WhatsApp' },
                  { Icon: Camera,        label: 'Instagram' },
                  { Icon: Globe,         label: 'Facebook' },
                ].map(({ Icon, label }) => (
                  <button key={label} aria-label={label} className="h-7 w-7 rounded-full flex items-center justify-center border border-border hover:border-foreground/30 transition-colors">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {storeName} · Tienda creada con{' '}
            <span className="font-medium text-foreground">KitDigital.ar</span>
          </p>
        </footer>
      </div>

      {/* ── CART DRAWER ── */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:w-96 flex flex-col p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Carrito ({cartCount})
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">Tu carrito está vacío</p>
                <p className="text-xs text-muted-foreground mt-1">Agregá productos para continuar</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {cartItems.map((p) => (
                  <div key={p.id} className="flex gap-3 p-4">
                    <div className="h-14 w-14 rounded-xl shrink-0 flex items-center justify-center" style={{ background: secondaryColor }}>
                      <p.Icon className="h-6 w-6" style={{ color: primaryColor, opacity: 0.3 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: primaryColor }}>{fmt(p.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {/* Compact stepper */}
                        <div className="flex items-stretch h-7 rounded-lg overflow-hidden border" style={{ borderColor: primaryColor }}>
                          <button onClick={() => removeFromCart(p.id)} className="w-7 flex items-center justify-center transition-colors hover:bg-muted/40">
                            <Minus className="h-2.5 w-2.5" style={{ color: primaryColor }} />
                          </button>
                          <span className="w-6 flex items-center justify-center text-xs font-bold" style={{ color: primaryColor }}>{cart[p.id]}</span>
                          <button onClick={() => addToCart(p.id)} className="w-7 flex items-center justify-center text-white transition-opacity hover:opacity-90" style={{ background: primaryColor }}>
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <span className="text-xs font-semibold ml-auto" style={{ color: primaryColor }}>{fmt(p.price * (cart[p.id] ?? 0))}</span>
                      </div>
                    </div>
                    <button onClick={() => setCart(c => { const n={...c}; delete n[p.id]; return n })} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {cartItems.length > 0 && (
            <div className="border-t border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold">{fmt(cartTotal)}</span>
              </div>
              <button
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" />
                Confirmar por WhatsApp
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Serás redirigido a WhatsApp para finalizar tu pedido
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── PRODUCT DETAIL SHEET ── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:w-[440px] flex flex-col p-0">
          {selected && (
            <>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <SheetTitle className="text-sm font-semibold flex-1">{selected.name}</SheetTitle>
                <SheetClose className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </SheetClose>
              </div>
              <ScrollArea className="flex-1">
                {/* Image */}
                <div className="aspect-square flex items-center justify-center" style={{ background: secondaryColor }}>
                  <selected.Icon className="h-28 w-28" style={{ color: primaryColor, opacity: 0.18 }} />
                </div>
                <div className="p-5 space-y-5">
                  {/* Title + price */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold leading-tight">{selected.name}</h2>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold" style={{ color: primaryColor }}>{fmt(selected.price)}</span>
                      {selected.comparePrice && (
                        <span className="text-sm text-muted-foreground line-through">{fmt(selected.comparePrice)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 text-warning ${i < Math.floor(selected.rating) ? 'fill-warning' : ''}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{selected.rating} · {selected.stock > 0 ? `${selected.stock} disponibles` : 'Sin stock'}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Variants */}
                  {modules.variants && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</p>
                        <div className="flex gap-2">
                          {VARIANT_COLORS.map((c, i) => (
                            <button
                              key={c}
                              onClick={() => setSelectedColor(i)}
                              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                              style={{ background: c, borderColor: selectedColor === i ? primaryColor : 'transparent', outlineOffset: 2, outline: selectedColor === i ? `2px solid ${primaryColor}` : 'none' }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Talle</p>
                        <div className="flex gap-2 flex-wrap">
                          {VARIANT_SIZES.map((size, i) => (
                            <button
                              key={size}
                              onClick={() => setSelectedSize(i)}
                              className="h-8 w-10 rounded-lg text-xs font-semibold border transition-colors"
                              style={selectedSize === i
                                ? { background: primaryColor, color: '#fff', borderColor: primaryColor }
                                : { background: 'transparent', color: 'inherit', borderColor: '#e8e8e8' }}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stock */}
                  {modules.stock && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`h-2 w-2 rounded-full ${selected.stock === 0 ? 'bg-error' : selected.stock <= 5 ? 'bg-warning' : 'bg-success'}`} />
                      {selected.stock === 0 ? 'Sin stock' : selected.stock <= 5 ? `Últimas ${selected.stock} unidades` : `${selected.stock} unidades disponibles`}
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.desc}</p>
                  </div>

                  {/* Trust */}
                  <div className="grid grid-cols-3 gap-2">
                    {[{ icon: Truck, label: 'Envío en 24–48hs' }, { icon: Shield, label: 'Compra segura' }, { icon: RotateCcw, label: 'Cambio gratis' }].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1 text-center p-2 rounded-lg bg-muted">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-2xs text-muted-foreground leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>

              {/* Footer CTA */}
              <div className="border-t border-border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl overflow-hidden border border-border">
                    <button onClick={() => setDetailQty(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-muted transition-colors"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="px-4 text-sm font-semibold">{detailQty}</span>
                    <button onClick={() => setDetailQty(q => q + 1)} className="px-3 py-2 hover:bg-muted transition-colors"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button
                    onClick={() => { for (let i = 0; i < detailQty; i++) addToCart(selected.id); setSelected(null); setCartOpen(true) }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ background: primaryColor }}
                    disabled={selected.stock === 0}
                  >
                    {selected.stock === 0 ? 'Sin stock' : `Agregar · ${fmt(selected.price * detailQty)}`}
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

    </StoreThemeProvider>
  )
}
