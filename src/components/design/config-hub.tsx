'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useDesignStore, COLOR_PRESETS, type ModuleKey } from '@/lib/stores/design-store'
import { StoreThemeProvider } from '@/components/shared/store-theme-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, Check, Layers, ShoppingBag, LayoutDashboard, Shield, Package, Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

const QUICK_LINKS = [
  { href: '/design/vitrine',    icon: ShoppingBag,     label: 'Vitrina',     desc: 'Catálogo público, carrito, checkout' },
  { href: '/design/admin',      icon: LayoutDashboard, label: 'Panel Admin', desc: 'Dashboard, productos, pedidos, módulos' },
  { href: '/design/superadmin', icon: Shield,           label: 'Superadmin',  desc: 'Gestión global, métricas, planes' },
  { href: '/design/components', icon: Layers,           label: 'Componentes', desc: 'Librería de UI — todos los primitivos' },
]

const MODULE_LIST: { key: ModuleKey; label: string; desc: string; plan: 'free' | 'pro' }[] = [
  // Free — incluidos en plan base ($20.000/mes)
  { key: 'banners',       label: 'Banners',            desc: 'Carrusel de imágenes en la vitrina',   plan: 'free' },
  { key: 'product_page',  label: 'Página de producto', desc: 'Detalle extendido e interno por producto', plan: 'free' },
  { key: 'categories',    label: 'Categorías',          desc: 'Filtro de categorías en vitrina',      plan: 'free' },
  { key: 'stock',         label: 'Stock',               desc: 'Control de inventario por producto',   plan: 'free' },
  { key: 'variants',      label: 'Variantes',           desc: 'Color, talla, material por producto',  plan: 'free' },
  { key: 'shipping',      label: 'Envíos',              desc: 'Métodos de envío y tracking',          plan: 'free' },
  { key: 'tasks',         label: 'Tareas',              desc: 'Gestión de tareas del equipo',         plan: 'free' },
  { key: 'payments',      label: 'Ventas',              desc: 'Registro de ventas y cobros (POS)',    plan: 'free' },
  { key: 'social',        label: 'Redes sociales',      desc: 'Links en el footer de la vitrina',     plan: 'free' },
  // Pro — extras ($5.000/mes c/u)
  { key: 'wholesale',     label: 'Mayorista',           desc: 'Tienda mayorista separada',            plan: 'pro'  },
  { key: 'finance',       label: 'Finanzas',            desc: 'Estadísticas de ingresos y gastos',    plan: 'pro'  },
  { key: 'multiuser',     label: 'Multi-usuario',       desc: 'Invitar colaboradores con roles',      plan: 'pro'  },
  { key: 'custom_domain', label: 'Dominio propio',      desc: 'Configurar dominio personalizado',     plan: 'pro'  },
  { key: 'assistant',     label: 'Asistente IA',        desc: 'Chat con GPT-4o-mini',                 plan: 'pro'  },
]

const PLAN_STYLE: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro:  'bg-violet-500/10 text-violet-600',
}

export function ConfigHub() {
  const {
    storeName, logoUrl, primaryColor, secondaryColor,
    setStoreName, setLogoUrl, setPrimaryColor, setSecondaryColor,
    applyPreset, modules, toggleModule,
  } = useDesignStore()

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-10">

      {/* Header con dark mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Panel de diseño</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Configurá la identidad visual de tu tienda y previsualiza los cambios en tiempo real.</p>
        </div>
        <button
          onClick={() => setIsDark(d => !d)}
          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:border-foreground/20 transition-colors"
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_LINKS.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-2 rounded-xl border border-border p-4 hover:border-foreground/20 hover:shadow-xs transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Identidad + colores */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Identidad de la tienda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Mi Tienda" />
              </div>
              <div className="space-y-1.5">
                <Label>URL del logo</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://... o /logo.jpg" />
                <p className="text-xs text-muted-foreground">En producción se gestiona desde Cloudinary.</p>
              </div>
              {logoUrl && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Image src={logoUrl} alt={storeName} width={36} height={36} className="rounded-md object-cover" onError={() => {}} />
                  <span className="text-sm font-medium">{storeName}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Colores de marca</CardTitle>
              <CardDescription className="text-xs">Se aplican en vitrina y panel admin de esta tienda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primario</Label>
                  <div className="flex items-center gap-2">
                    <label
                      className="h-9 w-9 rounded-xl overflow-hidden border border-border cursor-pointer block relative shrink-0 transition-colors hover:border-foreground/30"
                      style={{ background: primaryColor }}
                    >
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    <Input
                      value={primaryColor}
                      onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setPrimaryColor(e.target.value) }}
                      className="font-mono text-sm"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secundario</Label>
                  <div className="flex items-center gap-2">
                    <label
                      className="h-9 w-9 rounded-xl overflow-hidden border border-border cursor-pointer block relative shrink-0 transition-colors hover:border-foreground/30"
                      style={{ background: secondaryColor }}
                    >
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="absolute opacity-0 inset-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    <Input
                      value={secondaryColor}
                      onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setSecondaryColor(e.target.value) }}
                      className="font-mono text-sm"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Paletas rápidas</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:border-foreground/40 transition-colors"
                      style={{ borderColor: primaryColor === preset.primary ? preset.primary : undefined }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: preset.primary }} />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview vivo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Preview en vivo</p>
            <Link href="/design/vitrine" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Ver vitrina completa <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <StoreThemeProvider primaryColor={primaryColor} secondaryColor={secondaryColor}>
            {/* Mini vitrina */}
            <div className="rounded-xl border border-border overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <Image src={logoUrl} alt={storeName} width={22} height={22} className="rounded object-cover" />
                  ) : (
                    <div className="h-5.5 w-5.5 rounded flex items-center justify-center text-xs font-bold text-white" style={{ background: primaryColor }}>
                      {storeName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold">{storeName || 'Mi Tienda'}</span>
                </div>
                <button className="text-xs px-2.5 py-1 rounded-full font-medium text-white" style={{ background: primaryColor }}>
                  Carrito (2)
                </button>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2 bg-white">
                {[
                  { name: 'Remera', price: '$4.500' },
                  { name: 'Gorra', price: '$6.800' },
                  { name: 'Buzo', price: '$15.500' },
                ].map((p) => (
                  <div key={p.name} className="rounded-lg overflow-hidden border border-border/50">
                    <div className="h-14 flex items-center justify-center" style={{ background: secondaryColor }}>
                      <Package className="h-6 w-6" style={{ color: primaryColor, opacity: 0.4 }} />
                    </div>
                    <div className="p-1.5">
                      <p className="text-2xs font-medium truncate">{p.name}</p>
                      <p className="text-2xs font-semibold" style={{ color: primaryColor }}>{p.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-3 pb-3 bg-white">
                <button className="w-full py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: primaryColor }}>
                  Pedir por WhatsApp
                </button>
              </div>
            </div>

            {/* Mini admin */}
            <div className="rounded-xl border border-border overflow-hidden shadow-xs mt-3 flex" style={{ minHeight: 100 }}>
              <div className="w-24 p-2 space-y-0.5" style={{ background: primaryColor }}>
                {['Dashboard', 'Productos', 'Pedidos'].map((item, i) => (
                  <div
                    key={item}
                    className="px-2 py-1 rounded text-2xs font-medium"
                    style={{ background: i === 0 ? 'rgba(255,255,255,0.18)' : 'transparent', color: i === 0 ? '#fff' : 'rgba(255,255,255,0.55)' }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="flex-1 p-3 bg-white space-y-2">
                <p className="text-2xs font-semibold">Dashboard</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[{ l: 'Ventas', v: '$48.5k' }, { l: 'Pedidos', v: '8' }].map((s) => (
                    <div key={s.l} className="rounded border border-border/50 p-1.5">
                      <p className="text-2xs text-muted-foreground">{s.l}</p>
                      <p className="text-sm font-semibold" style={{ color: primaryColor }}>{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </StoreThemeProvider>
        </div>
      </div>

      <Separator />

      {/* Módulos */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Módulos activos en el preview</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Activá o desactivá módulos para ver cómo cambia la vitrina y el panel admin.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => MODULE_LIST.forEach(m => { if (!modules[m.key]) toggleModule(m.key) })}
            >
              Activar todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => MODULE_LIST.forEach(m => { if (modules[m.key]) toggleModule(m.key) })}
            >
              Desactivar todos
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {MODULE_LIST.map((mod) => {
            const active = modules[mod.key]
            return (
              <div
                key={mod.key}
                onClick={() => toggleModule(mod.key)}
                className={`relative flex items-start gap-3 rounded-xl border p-3 transition-all cursor-pointer hover:border-foreground/20 hover:shadow-xs ${
                  active ? 'border-border bg-primary/[0.03]' : 'border-border opacity-60'
                }`}
              >
                {/* Indicador top-right */}
                <div className="absolute top-3 right-3">
                  {active ? (
                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-border" />
                  )}
                </div>
                <div className="min-w-0 pr-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium ${active ? '' : 'text-muted-foreground'}`}>{mod.label}</span>
                    <Badge className={`text-2xs px-1.5 py-0 ${PLAN_STYLE[mod.plan]}`}>
                      {mod.plan}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{mod.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
