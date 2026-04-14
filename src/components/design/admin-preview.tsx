'use client'

import { useState } from 'react'
import { useDesignStore } from '@/lib/stores/design-store'
import { StoreThemeProvider } from '@/components/shared/store-theme-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { NativeScroll } from '@/components/ui/native-scroll'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard, Package, Package2, ShoppingBag, Settings, TrendingUp,
  Plus, Search, Edit2, Trash2, MoreHorizontal, ChevronRight, Menu,
  GripVertical, Tag, Truck, DollarSign, Activity, Layers, Bot, Wallet,
  CheckSquare, Globe, Lock, AlertCircle, BarChart2, Image as ImageIcon,
  Shirt, Footprints, Briefcase, X, Save, Filter, FileDown,
  Receipt, Link2, Check, ArrowUpDown, Copy, AlertTriangle,
  TrendingDown, CreditCard, Banknote, Smartphone,
  HelpCircle, Users, FileText, Send, ExternalLink, Share2, Sparkles, Loader2,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

// ── Types & data ──────────────────────────────────────────────────────────────

type Section =
  | 'dashboard' | 'ventas' | 'pedidos' | 'caja_ahorro'
  | 'productos' | 'categorias' | 'banners'
  | 'modulos' | 'configuracion' | 'stock' | 'variantes' | 'envios'
  | 'finanzas' | 'tareas' | 'asistente'

const ORDERS = [
  { id: '#0142', customer: 'María González', items: 3, total: 18500, status: 'pendiente',  date: 'Hoy 14:23'  },
  { id: '#0141', customer: 'Lucas Pérez',    items: 1, total: 4500,  status: 'confirmado', date: 'Hoy 11:08'  },
  { id: '#0140', customer: 'Ana Ramírez',    items: 2, total: 28000, status: 'enviado',    date: 'Ayer 16:45' },
  { id: '#0139', customer: 'Carlos Medina',  items: 4, total: 52000, status: 'entregado',  date: 'Ayer 09:12' },
  { id: '#0138', customer: 'Sofía Torres',   items: 1, total: 6800,  status: 'cancelado',  date: '12 abr'     },
]

const PRODUCTS_DATA = [
  { id: 1, name: 'Remera básica',    price: 4500,  cat: 'Ropa',       visible: true,  stock: 12, Icon: Shirt      },
  { id: 2, name: 'Pantalón cargo',   price: 12000, cat: 'Ropa',       visible: true,  stock: 8,  Icon: Shirt      },
  { id: 3, name: 'Gorra snapback',   price: 6800,  cat: 'Accesorios', visible: true,  stock: 25, Icon: Briefcase  },
  { id: 4, name: 'Zapatillas urban', price: 28000, cat: 'Calzado',    visible: false, stock: 4,  Icon: Footprints },
  { id: 5, name: 'Buzo hoodie',      price: 15500, cat: 'Ropa',       visible: true,  stock: 6,  Icon: Shirt      },
  { id: 6, name: 'Riñonera',         price: 8900,  cat: 'Accesorios', visible: true,  stock: 0,  Icon: Briefcase  },
]

const VENTAS_DATA = [
  { id: 'V-0038', time: '14:23', products: 'Remera básica x2',   client: 'María G.',  method: 'efectivo',     total: 9000,  status: 'cobrado' },
  { id: 'V-0037', time: '13:10', products: 'Buzo hoodie x1',     client: 'Sin nombre',method: 'transferencia', total: 15500, status: 'cobrado' },
  { id: 'V-0036', time: '11:45', products: 'Gorra x1, Riñonera', client: 'Lucas P.',  method: 'mp',           total: 15700, status: 'cobrado' },
  { id: 'V-0035', time: '10:02', products: 'Zapatillas urban x1',client: 'Ana R.',    method: 'debito',       total: 28000, status: 'pendiente'},
  { id: 'V-0034', time: '09:30', products: 'Remera básica x1',   client: 'Sin nombre',method: 'efectivo',     total: 4500,  status: 'cobrado' },
]

const SAVINGS_DATA = [
  { id: 1, name: 'María González', phone: '+54 11 2345-6789', balance: 12500,  lastActivity: 'Hoy' },
  { id: 2, name: 'Lucas Pérez',    phone: '+54 11 5678-9012', balance: -3200,  lastActivity: 'Ayer' },
  { id: 3, name: 'Ana Ramírez',    phone: '+54 9 11 3456-7890',balance: 8000,  lastActivity: '10 abr' },
  { id: 4, name: 'Carlos Medina',  phone: '+54 11 9012-3456', balance: 0,      lastActivity: '8 abr' },
]

const SAVINGS_MOVEMENTS = [
  { type: 'deposit',    amount: 5000,  desc: 'Abono parcial pedido #0139', date: 'Hoy 10:15'  },
  { type: 'deposit',    amount: 3000,  desc: 'Seña nueva compra',          date: 'Ayer 15:30' },
  { type: 'withdrawal', amount: 8000,  desc: 'Retiro en efectivo',         date: '10 abr'     },
  { type: 'deposit',    amount: 12500, desc: 'Ingreso inicial',            date: '5 abr'      },
]

const SHIPMENTS_DATA = [
  { code: 'KD-A3F9K2', orderId: '#0140', recipient: 'Ana Ramírez',    status: 'in_transit', date: 'Ayer' },
  { code: 'KD-B7M2P1', orderId: '#0139', recipient: 'Carlos Medina',  status: 'delivered',  date: '10 abr' },
  { code: 'KD-C4X8R5', orderId: '#0141', recipient: 'Lucas Pérez',    status: 'preparing',  date: 'Hoy' },
]

const BANNERS_DATA = [
  { id: 1, title: 'Nueva colección',     subtitle: 'Piezas seleccionadas para esta temporada', badge: 'NUEVO',    cta: 'Ver colección', active: true  },
  { id: 2, title: 'Envío gratis',        subtitle: 'En compras mayores a $15.000',              badge: 'PROMO',    cta: 'Aprovechar',    active: true  },
  { id: 3, title: 'Más de 50 productos', subtitle: 'Explorá todo el catálogo',                  badge: 'VER TODO', cta: 'Explorar',      active: false },
]

const AI_MESSAGES = [
  { role: 'assistant', text: 'Hola. Soy tu asistente de KitDigital. ¿En qué te puedo ayudar hoy?' },
  { role: 'user',      text: '¿Cuáles son mis pedidos pendientes?' },
  { role: 'assistant', text: 'Tenés 3 pedidos pendientes hoy:\n• #0142 — María González — $18.500 (pendiente de confirmar)\n• #0141 — Lucas Pérez — $4.500 (para preparar)\n• #0138 — Sofía Torres — $6.800 (cancelación solicitada)\n¿Querés que te ayude a procesar alguno?' },
  { role: 'user',      text: '¿Qué productos tienen stock crítico?' },
  { role: 'assistant', text: '2 productos están por debajo del umbral de alerta (≤ 5 unidades):\n• Zapatillas urban — 4 unidades\n• Buzo hoodie — 6 unidades\n• Riñonera — Sin stock\n\nTe recomiendo hacer un pedido de reposición antes del fin de semana.' },
]

const STATUS_STYLE: Record<string, string> = {
  pendiente:  'bg-warning/10 text-warning border-warning/20',
  confirmado: 'bg-info/10 text-info border-info/20',
  enviado:    'bg-pro/10 text-pro border-pro/20',
  entregado:  'bg-success/10 text-success border-success/20',
  cancelado:  'bg-muted text-muted-foreground border-border',
  cobrado:    'bg-success/10 text-success border-success/20',
}

const SHIPMENT_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  preparing:  { label: 'En preparación', cls: 'bg-warning/10 text-warning border-warning/20' },
  in_transit: { label: 'En camino',      cls: 'bg-pro/10 text-pro border-pro/20' },
  delivered:  { label: 'Entregado',      cls: 'bg-success/10 text-success border-success/20' },
}

const METHOD_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transf.', mp: 'Mercado Pago', debito: 'Débito',
}

// Tiers: free (incluido en $20k/mes) y pro (extra $5k/mes c/u)
const MODULE_CATALOG = [
  // ── Free (incluido en plan base) ───────────────────────────────────────────
  { key: 'banners',       label: 'Banners',           desc: 'Carrusel de imágenes en la vitrina',  tier: 'free', icon: ImageIcon   },
  { key: 'product_page',  label: 'Página de producto', desc: 'Detalle extendido e interno por producto', tier: 'free', icon: FileText   },
  { key: 'categories',    label: 'Categorías',         desc: 'Filtros de categoría en vitrina',     tier: 'free', icon: Tag         },
  { key: 'stock',         label: 'Stock',              desc: 'Control de inventario',               tier: 'free', icon: Package2    },
  { key: 'variants',      label: 'Variantes',          desc: 'Talla, color, material',              tier: 'free', icon: ArrowUpDown },
  { key: 'shipping',      label: 'Envíos',             desc: 'Métodos de envío y tracking',         tier: 'free', icon: Truck       },
  { key: 'tasks',         label: 'Tareas',             desc: 'Gestión del equipo',                  tier: 'free', icon: CheckSquare },
  { key: 'payments',      label: 'Ventas',             desc: 'Registro de ventas y cobros (POS)',   tier: 'free', icon: Receipt     },
  { key: 'social',        label: 'Redes sociales',     desc: 'Links en footer de vitrina',          tier: 'free', icon: Share2      },
  // ── Pro (extras $5.000/mes c/u) ────────────────────────────────────────────
  { key: 'wholesale',     label: 'Mayorista',          desc: 'Tienda mayorista separada',           tier: 'pro',  icon: BarChart2   },
  { key: 'finance',       label: 'Finanzas',           desc: 'Estadísticas de ingresos y gastos',   tier: 'pro',  icon: DollarSign  },
  { key: 'multiuser',     label: 'Multi-usuario',      desc: 'Roles y colaboradores',               tier: 'pro',  icon: Users       },
  { key: 'custom_domain', label: 'Dominio propio',     desc: 'dominio.com personalizado',           tier: 'pro',  icon: Globe       },
  { key: 'assistant',     label: 'Asistente IA',       desc: 'Chat con GPT-4o-mini',                tier: 'pro',  icon: Bot         },
]

const TIER_BADGE: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro:  'bg-pro/10 text-pro',
}

const PRO_MODULES = MODULE_CATALOG.filter(m => m.tier === 'pro')
const BASE_PRICE  = 20000
const PRO_PRICE   = 5000

function fmt(n: number) { return `$${Math.abs(n).toLocaleString('es-AR')}` }

// ── Variant groups ─────────────────────────────────────────────────────────────
// type 'shared'      → values defined store-wide; product selects which apply
// type 'per_product' → no master list; each product defines its own values

const VARIANT_GROUPS = [
  { key: 'color',    name: 'Color',    type: 'per_product' as const, products: 4, values: [] as string[] },
  { key: 'talle',    name: 'Talle',    type: 'shared'      as const, products: 3, values: ['XS','S','M','L','XL','XXL'] },
  { key: 'material', name: 'Material', type: 'shared'      as const, products: 1, values: ['Algodón','Poliéster','Lino'] },
]

// ── Toolbar component ─────────────────────────────────────────────────────────

function Toolbar({
  placeholder = 'Buscar...',
  extraFilters,
}: {
  placeholder?: string
  extraFilters?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input placeholder={placeholder} className="pl-9 h-9 text-sm w-full" />
      </div>
      {extraFilters}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
            <FileDown className="h-3.5 w-3.5" />Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
            <FileDown className="h-3.5 w-3.5" />Exportar PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminPreview() {
  const { storeName, logoUrl, primaryColor, secondaryColor, modules, toggleModule } = useDesignStore()
  const [section,         setSection]        = useState<Section>('dashboard')
  const [productForm,     setProductForm]    = useState(false)
  const [orderDetail,     setOrderDetail]    = useState<typeof ORDERS[0] | null>(null)
  const [editProduct,     setEditProduct]    = useState<typeof PRODUCTS_DATA[0] | null>(null)
  const [visibleProducts, setVisibleProducts]= useState<Record<number, boolean>>(
    Object.fromEntries(PRODUCTS_DATA.map(p => [p.id, p.visible]))
  )
  const [productPages,    setProductPages]   = useState<Record<number, boolean>>({ 1: true, 3: true })
  const [sidebarOpen,     setSidebarOpen]    = useState(false)
  const [savingsDetail,   setSavingsDetail]  = useState<typeof SAVINGS_DATA[0] | null>(null)
  const [enviosTab,       setEnviosTab]      = useState<'metodos' | 'activos'>('metodos')
  const [finanzasPeriod,  setFinanzasPeriod] = useState('mes')
  const [pedidosFilter,   setPedidosFilter]  = useState('todos')
  const [copiedCode,      setCopiedCode]     = useState<string | null>(null)
  const [chatInput,       setChatInput]      = useState('')
  const [bannersActive,   setBannersActive]  = useState<Record<number, boolean>>(
    Object.fromEntries(BANNERS_DATA.map(b => [b.id, b.active]))
  )
  const [savingConfig,    setSavingConfig]   = useState(false)
  const [savingProduct,   setSavingProduct]  = useState(false)
  const [orderStatuses,   setOrderStatuses]  = useState<Record<string, string>>(
    Object.fromEntries(ORDERS.map(o => [o.id, o.status]))
  )

  function copyTracking(code: string) {
    setCopiedCode(code)
    toast.success('Link copiado', { description: `kitdigital.ar/tracking/${code}` })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  function handleSaveConfig() {
    setSavingConfig(true)
    setTimeout(() => {
      setSavingConfig(false)
      toast.success('Configuración guardada', { description: 'Los cambios se aplicarán en la vitrina.' })
    }, 700)
  }

  function handleSaveProduct() {
    setSavingProduct(true)
    setTimeout(() => {
      setSavingProduct(false)
      setProductForm(false)
      toast.success(editProduct ? 'Producto actualizado' : 'Producto creado', {
        description: 'Los cambios se reflejan en la vitrina.',
      })
    }, 600)
  }

  function handleOrderStatusChange(orderId: string, newStatus: string) {
    setOrderStatuses(prev => ({ ...prev, [orderId]: newStatus }))
    const labels: Record<string, string> = {
      confirmado: 'Pedido confirmado',
      preparando: 'En preparación',
      enviado:    'Marcado como enviado',
      entregado:  'Pedido entregado',
      cancelado:  'Pedido cancelado',
    }
    toast.success(labels[newStatus] ?? 'Estado actualizado', { description: `Pedido ${orderId}` })
  }

  type NavItem = { section: Section; icon: React.ElementType; label: string; badge?: string }
  type NavGroup = { label: string; items: NavItem[] }

  const NAV_GROUPS: NavGroup[] = [
    {
      label: 'Operaciones',
      items: [
        { section: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard'       },
        ...(modules.payments ? [{ section: 'ventas' as Section, icon: Receipt, label: 'Ventas' }] : []),
        { section: 'pedidos',     icon: ShoppingBag,     label: 'Pedidos', badge: '3' },
        { section: 'caja_ahorro', icon: Wallet,          label: 'Caja de Ahorro'  },
      ],
    },
    {
      label: 'Catálogo',
      items: [
        { section: 'productos',  icon: Package,     label: 'Productos'  },
        { section: 'categorias', icon: Tag,         label: 'Categorías' },
        ...(modules.banners   ? [{ section: 'banners'   as Section, icon: ImageIcon,  label: 'Banners'   }] : []),
        ...(modules.stock     ? [{ section: 'stock'     as Section, icon: Package2,   label: 'Stock'     }] : []),
        ...(modules.variants  ? [{ section: 'variantes' as Section, icon: ArrowUpDown,label: 'Variantes' }] : []),
      ],
    },
    {
      label: 'Herramientas',
      items: [
        ...(modules.shipping   ? [{ section: 'envios'    as Section, icon: Truck,       label: 'Envíos'        }] : []),
        ...(modules.finance    ? [{ section: 'finanzas'  as Section, icon: DollarSign,  label: 'Finanzas'      }] : []),
        ...(modules.tasks      ? [{ section: 'tareas'    as Section, icon: CheckSquare, label: 'Tareas'        }] : []),
        ...(modules.assistant  ? [{ section: 'asistente' as Section, icon: Bot,         label: 'Asistente IA'  }] : []),
      ],
    },
    {
      label: 'Ajustes',
      items: [
        { section: 'modulos',       icon: Layers,   label: 'Módulos'       },
        { section: 'configuracion', icon: Settings, label: 'Configuración' },
      ],
    },
  ]

  const allNavItems = NAV_GROUPS.flatMap(g => g.items)

  function navigate(s: Section) { setSection(s); setSidebarOpen(false) }

  // ── Sidebar ──────────────────────────────────────────────────────────────
  function SidebarContent() {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          {logoUrl ? (
            <Image src={logoUrl} alt={storeName} width={28} height={28} className="rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {storeName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white/90 truncate">{storeName}</p>
            <p className="text-2xs text-white/40 truncate">Panel de gestión</p>
          </div>
        </div>

        {/* Nav */}
        <NativeScroll className="flex-1 py-2">
          <nav className="px-2">
            {NAV_GROUPS.map((group, gi) => {
              if (group.items.length === 0) return null
              return (
                <div key={group.label}>
                  <p className={`px-3 pb-1.5 text-2xs font-medium uppercase tracking-wider text-white/30 ${gi === 0 ? 'pt-2' : 'pt-4'}`}>
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(({ section: s, icon: Icon, label, badge }) => (
                      <button
                        key={s}
                        onClick={() => navigate(s)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                          section === s
                            ? 'bg-white/15 text-white'
                            : 'text-white/55 hover:text-white/85 hover:bg-white/8'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {label}
                        {badge && <span className="ml-auto text-2xs bg-white/20 rounded-full px-1.5">{badge}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>
        </NativeScroll>

        {/* Footer — soporte + cerrar sesión */}
        <div className="px-4 pb-3 pt-3 border-t space-y-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <button
            title="Soporte KitDigital"
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors border border-white/15 text-white/70 hover:bg-white/10"
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Soporte</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          </button>

          <button className="w-full text-left text-2xs underline underline-offset-4 text-white/45 hover:text-white/75 transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // ── Section: Dashboard ───────────────────────────────────────────────────
  function renderDashboard() {
    return (
      <div className="p-5 pb-10 space-y-6 max-w-5xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Ventas hoy',     value: '$48.500', sub: '+12% vs ayer',      icon: TrendingUp,  accent: true  },
            { label: 'Pedidos',        value: '8',       sub: '3 pendientes',      icon: ShoppingBag, accent: false },
            { label: 'Productos',      value: '24',      sub: '2 sin stock',       icon: Package,     accent: false },
            { label: 'Caja de Ahorro', value: '4',       sub: '$17.300 pendiente', icon: Wallet,      accent: false },
          ].map((s) => (
            <Card key={s.label} className={`hover:shadow-xs transition-shadow ${s.accent ? 'border-success/25 bg-success/[0.025]' : 'border-border'}`}>
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between mb-1">
                  <CardDescription className="text-2xs uppercase tracking-wide font-medium">{s.label}</CardDescription>
                  <s.icon className={`h-3.5 w-3.5 ${s.accent ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
                <CardTitle className={`text-2xl font-bold tracking-tight ${s.accent ? 'text-success' : ''}`}>{s.value}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className={`text-xs ${s.accent ? 'text-success/70' : 'text-muted-foreground'}`}>{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Nueva venta',    icon: Receipt,    action: () => modules.payments ? navigate('ventas') : navigate('modulos')   },
            { label: 'Ver pedidos',    icon: ShoppingBag,action: () => navigate('pedidos')  },
            { label: 'Caja de ahorro', icon: Wallet,     action: () => navigate('caja_ahorro') },
            { label: 'Configuración',  icon: Settings,   action: () => navigate('configuracion') },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-medium hover:border-foreground/20 hover:shadow-xs transition-all text-left"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Tienda mayorista link — si módulo activo */}
        {modules.wholesale && (
          <div className="flex items-center gap-3 rounded-xl border border-pro/20 bg-pro/10 px-4 py-3">
            <BarChart2 className="h-4 w-4 text-pro shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">Tienda Mayorista activa</p>
              <p className="text-2xs text-muted-foreground font-mono truncate">mayorista.kitdigital.ar/mi-tienda</p>
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-pro shrink-0">
              <Copy className="h-3 w-3" />Copiar
            </button>
          </div>
        )}

        {/* Recent orders */}
        <Card className="border-border/60">
          <CardHeader className="px-5 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Pedidos recientes</CardTitle>
              <button onClick={() => navigate('pedidos')} className="text-xs font-medium flex items-center gap-1" style={{ color: primaryColor }}>
                Ver todos <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {ORDERS.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center gap-3 py-2.5 border-b border-border/60 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{o.id}</span>
                    <span className="text-xs font-medium truncate">{o.customer}</span>
                  </div>
                  <span className="text-2xs text-muted-foreground">{o.date} · {o.items} ítems</span>
                </div>
                <span className="text-xs font-semibold shrink-0">{fmt(o.total)}</span>
                <Badge className={`text-2xs border shrink-0 ${STATUS_STYLE[o.status]}`} variant="outline">{o.status}</Badge>
                <button onClick={() => setOrderDetail(o)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Section: Ventas (POS / Caja) ─────────────────────────────────────────
  function renderVentas() {
    const totalEfectivo = VENTAS_DATA.filter(v => v.method === 'efectivo').reduce((s, v) => s + v.total, 0)
    const totalTransf   = VENTAS_DATA.filter(v => v.method === 'transferencia').reduce((s, v) => s + v.total, 0)
    const totalMP       = VENTAS_DATA.filter(v => v.method === 'mp').reduce((s, v) => s + v.total, 0)
    const totalDia      = VENTAS_DATA.reduce((s, v) => s + v.total, 0)

    return (
      <div className="p-5 pb-10 space-y-5 max-w-4xl mx-auto">
        <Card className="border-border/60">
          <CardHeader className="px-5 pt-4 pb-3">
            <CardTitle className="text-sm font-semibold">Registrar venta</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Producto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Buscar o escanear producto..." className="pl-9 h-9 text-sm" />
              </div>
              <div className="rounded-lg border border-border divide-y divide-border/60">
                {PRODUCTS_DATA.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer">
                    <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0" style={{ background: secondaryColor }}>
                      <p.Icon className="h-3.5 w-3.5" style={{ color: primaryColor, opacity: 0.4 }} />
                    </div>
                    <span className="flex-1 text-xs font-medium">{p.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{fmt(p.price)}</span>
                    {modules.stock && (
                      <span className={`text-2xs ${p.stock === 0 ? 'text-error' : 'text-muted-foreground'}`}>
                        {p.stock === 0 ? 'Sin stock' : `${p.stock} u.`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cantidad</Label>
                <Input type="number" defaultValue={1} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Precio unit.</Label>
                <Input type="number" placeholder="0" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subtotal</Label>
                <Input readOnly value="$9.000" className="h-9 text-sm bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Medio de pago</Label>
                <Select defaultValue="efectivo">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo"><span className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5" />Efectivo</span></SelectItem>
                    <SelectItem value="transferencia"><span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5" />Transferencia</span></SelectItem>
                    <SelectItem value="debito"><span className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5" />Débito</span></SelectItem>
                    <SelectItem value="mp"><span className="flex items-center gap-2"><Smartphone className="h-3.5 w-3.5" />Mercado Pago</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente (opcional)</Label>
                <Input placeholder="Nombre o teléfono" className="h-9 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Input placeholder="Observaciones del vendedor..." className="h-9 text-sm" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-base font-bold">Total: <span style={{ color: primaryColor }}>$9.000</span></p>
              <Button className="gap-2 text-sm">
                <Check className="h-4 w-4" />Registrar venta
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Efectivo',     value: fmt(totalEfectivo), icon: Banknote,   color: 'text-foreground' },
            { label: 'Transf.',      value: fmt(totalTransf),   icon: CreditCard, color: 'text-foreground' },
            { label: 'Mercado Pago', value: fmt(totalMP),       icon: Smartphone, color: 'text-foreground' },
            { label: 'Total del día',value: fmt(totalDia),      icon: TrendingUp, color: 'text-success'    },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xs text-muted-foreground uppercase tracking-wide font-medium">{s.label}</p>
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Toolbar
            placeholder="Buscar venta..."
            extraFilters={
              <Select defaultValue="todos">
                <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Medio de pago" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los medios</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="mp">Mercado Pago</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
            {VENTAS_DATA.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-muted/20 transition-colors cursor-pointer">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{v.id}</span>
                    <span className="text-xs font-medium truncate">{v.products}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-2xs border ${STATUS_STYLE[v.status]}`} variant="outline">{v.status}</Badge>
                    <Badge variant="outline" className="text-2xs font-normal">{METHOD_LABEL[v.method] ?? v.method}</Badge>
                  </div>
                </div>
                <span className="text-xs font-semibold shrink-0">{fmt(v.total)}</span>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Hora</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Productos</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Medio</th>
                  <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Total</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {VENTAS_DATA.map((v) => (
                  <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-muted-foreground">{v.id}</td>
                    <td className="px-3 py-3 text-muted-foreground">{v.time}</td>
                    <td className="px-3 py-3 font-medium truncate max-w-[140px]">{v.products}</td>
                    <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{v.client}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className="text-2xs font-normal">{METHOD_LABEL[v.method] ?? v.method}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{fmt(v.total)}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge className={`text-2xs border ${STATUS_STYLE[v.status]}`} variant="outline">{v.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── Section: Productos ───────────────────────────────────────────────────
  function renderProductos() {
    return (
      <div className="p-5 pb-10 space-y-4 max-w-4xl mx-auto">
        <Toolbar
          placeholder="Buscar producto..."
          extraFilters={
            <Select defaultValue="todas">
              <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las cat.</SelectItem>
                <SelectItem value="ropa">Ropa</SelectItem>
                <SelectItem value="accesorios">Accesorios</SelectItem>
                <SelectItem value="calzado">Calzado</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
          {PRODUCTS_DATA.map((p) => (
            <div key={p.id} onClick={() => { setEditProduct(p); setProductForm(true) }} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-muted/20 transition-colors cursor-pointer">
              <div className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center border border-border/50" style={{ background: secondaryColor }}>
                <p.Icon className="h-4 w-4" style={{ color: primaryColor, opacity: 0.35 }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold truncate">{p.name}</span>
                  <Badge variant="outline" className="text-2xs font-normal shrink-0">{p.cat}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-muted-foreground">{fmt(p.price)}</span>
                  {modules.stock && (
                    <span className={`text-2xs font-medium ${p.stock === 0 ? 'text-error' : p.stock <= 5 ? 'text-warning' : 'text-muted-foreground'}`}>
                      {p.stock === 0 ? 'Sin stock' : `${p.stock} u.`}
                    </span>
                  )}
                </div>
              </div>
              <Switch
                checked={visibleProducts[p.id] ?? p.visible}
                onCheckedChange={(v) => { setVisibleProducts(prev => ({ ...prev, [p.id]: v })) }}
                className="scale-75 shrink-0"
                onClick={(e) => e.stopPropagation()}
              />
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
            </div>
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Producto</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Categoría</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Precio</th>
                {modules.stock && <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Stock</th>}
                {modules.product_page && <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Página</th>}
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Visible</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {PRODUCTS_DATA.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center border border-border/50" style={{ background: secondaryColor }}>
                        <p.Icon className="h-4 w-4" style={{ color: primaryColor, opacity: 0.35 }} />
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className="text-2xs font-normal">{p.cat}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{fmt(p.price)}</td>
                  {modules.stock && (
                    <td className="px-3 py-3 text-right hidden md:table-cell">
                      <span className={p.stock === 0 ? 'text-error font-medium' : p.stock <= 5 ? 'text-warning font-medium' : 'text-muted-foreground'}>
                        {p.stock === 0 ? 'Sin stock' : p.stock}
                      </span>
                    </td>
                  )}
                  {modules.product_page && (
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setProductPages(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                        className="inline-flex items-center justify-center"
                        title={productPages[p.id] ? 'Página interna activa' : 'Sin página interna'}
                      >
                        <FileText className={`h-3.5 w-3.5 transition-colors ${productPages[p.id] ? '' : 'text-muted-foreground/30'}`} style={{ color: productPages[p.id] ? primaryColor : undefined }} />
                      </button>
                    </td>
                  )}
                  <td className="px-3 py-3 text-center">
                    <Switch
                      checked={visibleProducts[p.id] ?? p.visible}
                      onCheckedChange={(v) => setVisibleProducts(prev => ({ ...prev, [p.id]: v }))}
                      className="scale-75"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { setEditProduct(p); setProductForm(true) }} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-error">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Section: Categorías ──────────────────────────────────────────────────
  function renderCategorias() {
    const cats = [
      { name: 'Ropa',       count: 3, slug: 'ropa'       },
      { name: 'Accesorios', count: 2, slug: 'accesorios' },
      { name: 'Calzado',    count: 1, slug: 'calzado'    },
    ]
    return (
      <div className="p-5 pb-10 space-y-4 max-w-3xl mx-auto">
        <p className="text-xs text-muted-foreground">Ordená arrastrando · Los cambios se reflejan en la vitrina</p>
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c.slug} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 bg-white hover:border-foreground/20 transition-colors cursor-grab">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{c.count} productos</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-error transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Section: Banners ─────────────────────────────────────────────────────
  function renderBanners() {
    return (
      <div className="p-5 pb-10 space-y-4 max-w-3xl mx-auto">
        <div className="flex gap-3 rounded-xl border border-info/20 bg-info/10 p-3 text-info">
          <ImageIcon className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">Estos banners se muestran en el carrusel de tu vitrina pública. Se muestran en el orden indicado.</p>
        </div>

        <div className="space-y-3">
          {BANNERS_DATA.map((b) => (
            <div
              key={b.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${bannersActive[b.id] ? 'border-border' : 'border-border opacity-55'}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5 cursor-grab" />

              {/* Imagen preview */}
              <div
                className="h-16 w-24 rounded-lg flex flex-col items-center justify-center shrink-0 text-center px-2"
                style={{ background: primaryColor }}
              >
                <span className="text-2xs font-semibold text-white/60 uppercase tracking-wider mb-0.5">{b.badge}</span>
                <p className="text-2xs font-semibold text-white leading-tight line-clamp-2">{b.title}</p>
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{b.title}</p>
                <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xs text-muted-foreground">CTA: <span className="font-medium text-foreground">{b.cta}</span></span>
                  <Badge className="text-2xs px-1.5 py-0 bg-muted text-muted-foreground">{b.badge}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={bannersActive[b.id] ?? b.active}
                  onCheckedChange={(v) => setBannersActive(prev => ({ ...prev, [b.id]: v }))}
                  className="scale-75"
                />
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-error transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}

          <button className="w-full rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground hover:border-foreground/30 flex items-center justify-center gap-2 transition-colors">
            <Plus className="h-3.5 w-3.5" />Agregar banner
          </button>
        </div>
      </div>
    )
  }

  // ── Section: Pedidos ─────────────────────────────────────────────────────
  function renderPedidos() {
    const filterTabs = ['todos', 'pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado', 'archivado']
    const filtered = pedidosFilter === 'todos' ? ORDERS : ORDERS.filter(o => o.status === pedidosFilter)
    return (
      <div className="p-5 pb-10 space-y-4 max-w-4xl mx-auto">
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5">
          {filterTabs.map(f => (
            <button
              key={f}
              onClick={() => setPedidosFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                pedidosFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f === 'todos' ? 'Todos' : f}
            </button>
          ))}
        </div>
        <Toolbar placeholder="Buscar por cliente o #pedido..." />

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border py-16 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium">Sin pedidos en este estado</p>
            <p className="text-xs text-muted-foreground mt-1">Los pedidos archivados aparecerán aquí</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
              {filtered.map((o) => (
                <div key={o.id} onClick={() => setOrderDetail(o)} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-muted/20 transition-colors cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold font-mono text-muted-foreground">{o.id}</span>
                      <span className="text-xs font-medium truncate">{o.customer}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`text-2xs border ${STATUS_STYLE[o.status]}`} variant="outline">{o.status}</Badge>
                      <span className="text-2xs text-muted-foreground">{o.date}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold shrink-0">{fmt(o.total)}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Total</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Estado</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setOrderDetail(o)}>
                      <td className="px-4 py-3 font-mono font-medium text-muted-foreground">{o.id}</td>
                      <td className="px-3 py-3 font-medium">{o.customer}</td>
                      <td className="px-3 py-3 text-muted-foreground">{o.date}</td>
                      <td className="px-3 py-3 text-right font-semibold">{fmt(o.total)}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge className={`text-2xs border ${STATUS_STYLE[o.status]}`} variant="outline">{o.status}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Section: Caja de Ahorro ──────────────────────────────────────────────
  function renderCajaAhorro() {
    return (
      <div className="p-5 pb-10 space-y-4 max-w-4xl mx-auto">
        <div className="flex gap-3 rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">1 cliente con saldo negativo (debe dinero). <button className="underline font-medium" onClick={() => setSavingsDetail(SAVINGS_DATA.find(c => c.balance < 0) ?? null)}>Ver detalle</button></p>
        </div>
        <Toolbar placeholder="Buscar cliente..." />
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Contacto</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Saldo</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Última actividad</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {SAVINGS_DATA.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSavingsDetail(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full text-white flex items-center justify-center text-2xs font-bold shrink-0" style={{ background: primaryColor }}>
                        {c.name.charAt(0)}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell font-mono">{c.phone}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`font-semibold ${c.balance > 0 ? 'text-success' : c.balance < 0 ? 'text-error' : 'text-muted-foreground'}`}>
                      {c.balance === 0 ? '$0' : `${c.balance > 0 ? '+' : '-'}${fmt(c.balance)}`}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{c.lastActivity}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground"><ChevronRight className="h-3.5 w-3.5" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Section: Módulos ─────────────────────────────────────────────────────
  function renderModulos() {
    const freeModules = MODULE_CATALOG.filter(m => m.tier === 'free')
    const proModules  = MODULE_CATALOG.filter(m => m.tier === 'pro')
    const activeProKeys = proModules.filter(m => modules[m.key as keyof typeof modules])
    const totalPrice = BASE_PRICE + activeProKeys.length * PRO_PRICE

    return (
      <div className="p-5 pb-10 space-y-6 max-w-3xl mx-auto">

        {/* Free modules */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold">Incluidos en el plan base</p>
            <Badge className="text-2xs px-1.5 py-0 bg-muted text-muted-foreground">free · $20.000/mes</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {freeModules.map((mod) => {
              const isOn = modules[mod.key as keyof typeof modules]
              return (
                <div
                  key={mod.key}
                  onClick={() => toggleModule(mod.key as Parameters<typeof toggleModule>[0])}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all cursor-pointer select-none ${
                    isOn
                      ? 'border-primary/20 bg-primary/[0.025] hover:border-primary/30'
                      : 'border-border hover:border-foreground/15 hover:bg-muted/20'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isOn ? '' : 'bg-muted'}`}
                    style={isOn ? { background: primaryColor } : {}}
                  >
                    <mod.icon className="h-3.5 w-3.5" style={{ color: isOn ? '#fff' : '#999' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold">{mod.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{mod.desc}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isOn ? 'bg-primary border-primary' : 'border-border'
                  }`}>
                    {isOn && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pro modules */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold">Módulos Pro</p>
            <Badge className="text-2xs px-1.5 py-0 bg-pro/10 text-pro">+$5.000/mes c/u</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {proModules.map((mod) => {
              const isOn = modules[mod.key as keyof typeof modules]
              return (
                <div
                  key={mod.key}
                  onClick={() => toggleModule(mod.key as Parameters<typeof toggleModule>[0])}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all cursor-pointer select-none ${
                    isOn
                      ? 'border-pro/20 bg-pro/[0.025] hover:border-pro/30'
                      : 'border-border hover:border-foreground/15 hover:bg-muted/20'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isOn ? 'bg-pro' : 'bg-muted'}`}>
                    <mod.icon className="h-3.5 w-3.5" style={{ color: isOn ? '#fff' : '#999' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{mod.label}</span>
                      {isOn && <span className="text-2xs text-pro font-medium">+$5.000/mes</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{mod.desc}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isOn ? 'bg-pro border-pro' : 'border-border'
                  }`}>
                    {isOn && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Billing summary */}
        <Card className="border-border/60">
          <CardHeader className="px-5 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold">Resumen de facturación</CardTitle>
            <CardDescription className="text-xs">Estimado mensual según módulos activos</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <div>
                <span className="text-xs font-medium">Plan base</span>
                <p className="text-2xs text-muted-foreground">Incluye todos los módulos free</p>
              </div>
              <span className="text-xs font-semibold">{fmt(BASE_PRICE)}/mes</span>
            </div>
            {activeProKeys.map(mod => (
              <div key={mod.key} className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-pro" />{mod.label}
                </span>
                <span className="text-xs text-pro font-medium">+{fmt(PRO_PRICE)}/mes</span>
              </div>
            ))}
            {activeProKeys.length === 0 && (
              <p className="text-xs text-muted-foreground py-1">Sin módulos pro activos. Activá alguno para extender las funcionalidades.</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-semibold">Total estimado</span>
              <span className="text-lg font-bold">{fmt(totalPrice)}/mes</span>
            </div>
          </CardContent>
        </Card>

      </div>
    )
  }

  // ── Section: Configuración ───────────────────────────────────────────────
  function renderConfiguracion() {
    return (
      <div className="p-5 pb-10 max-w-lg mx-auto space-y-5">
        {/* Identidad */}
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Identidad</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Nombre de la tienda</Label><Input defaultValue={storeName} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">WhatsApp</Label><Input defaultValue="+54 11 1234-5678" className="h-9 text-sm" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo</Label>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl border border-border flex items-center justify-center shrink-0" style={{ background: secondaryColor }}>
                  {logoUrl ? <Image src={logoUrl} alt="" width={48} height={48} className="rounded-xl object-cover" /> : <ImageIcon className="h-5 w-5 text-muted-foreground/40" />}
                </div>
                <Button variant="outline" size="sm" className="text-xs h-9">Subir logo</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colores */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Colores de la tienda</CardTitle>
            <CardDescription className="text-xs">Afectan la vitrina y el panel admin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg border border-border shrink-0" style={{ background: primaryColor }} />
              <div className="flex-1 space-y-0.5"><p className="text-xs font-medium">Color primario</p><p className="text-2xs text-muted-foreground font-mono">{primaryColor}</p></div>
              <Button variant="outline" size="sm" className="text-xs h-8">Cambiar</Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg border border-border shrink-0" style={{ background: secondaryColor }} />
              <div className="flex-1 space-y-0.5"><p className="text-xs font-medium">Color secundario</p><p className="text-2xs text-muted-foreground font-mono">{secondaryColor}</p></div>
              <Button variant="outline" size="sm" className="text-xs h-8">Cambiar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Redes sociales */}
        {modules.social && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />Redes sociales
              </CardTitle>
              <CardDescription className="text-xs">Los links aparecen en el footer de tu vitrina</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Instagram', placeholder: 'instagram.com/mitienda' },
                { label: 'TikTok',    placeholder: 'tiktok.com/@mitienda'   },
                { label: 'Facebook',  placeholder: 'facebook.com/mitienda'  },
                { label: 'WhatsApp Business', placeholder: '+54 11 1234-5678' },
              ].map(s => (
                <div key={s.label} className="space-y-1.5">
                  <Label className="text-xs">{s.label}</Label>
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input placeholder={s.placeholder} className="h-9 text-sm" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Multi-usuario */}
        {modules.multiuser && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Equipo</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Colaboradores con acceso al panel</CardDescription>
                </div>
                <Button size="sm" className="h-8 gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />Invitar</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: storeName || 'Mi Tienda', email: 'admin@mitienda.com', role: 'Propietario', self: true },
                { name: 'Lucía Gómez',            email: 'lucia@mitienda.com', role: 'Admin',        self: false },
                { name: 'Martín López',            email: 'martin@mitienda.com',role: 'Operador',     self: false },
              ].map((u, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                  <div className="h-7 w-7 rounded-full text-white flex items-center justify-center text-2xs font-bold shrink-0" style={{ background: primaryColor }}>
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.name} {u.self && <span className="text-muted-foreground">(vos)</span>}</p>
                    <p className="text-2xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="outline" className="text-2xs font-normal shrink-0">{u.role}</Badge>
                  {!u.self && <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-error transition-colors"><X className="h-3 w-3" /></button>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tienda Mayorista */}
        {modules.wholesale && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />Tienda Mayorista
              </CardTitle>
              <CardDescription className="text-xs">Acceso separado con precios por cantidad para compradores frecuentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Link de tu tienda mayorista</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value="mayorista.kitdigital.ar/mi-tienda" className="h-9 text-sm bg-muted font-mono text-xs" />
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0"><Copy className="h-3.5 w-3.5" />Copiar</Button>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-medium">Acceso público</p>
                  <p className="text-2xs text-muted-foreground">Cualquier persona con el link puede ver los precios mayoristas</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/60">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-2xs text-muted-foreground">Los productos con precio mayorista cargado muestran ambos precios según el tipo de tienda visitada.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dominio propio */}
        {modules.custom_domain && (
          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Dominio personalizado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tu dominio</Label>
                <Input placeholder="www.mitienda.com" className="h-9 text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">Apuntá tu dominio a <span className="font-mono">cname.kitdigital.ar</span> para activarlo.</p>
            </CardContent>
          </Card>
        )}

        <Button className="w-full gap-2 text-sm" onClick={handleSaveConfig} disabled={savingConfig}>
          {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {savingConfig ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    )
  }

  // ── Section: Variantes ───────────────────────────────────────────────────
  function renderVariantes() {
    return (
      <div className="p-5 pb-10 space-y-4 max-w-3xl mx-auto">
        <p className="text-xs text-muted-foreground">Define los atributos que tus productos pueden tener. Cada grupo puede ser compartido o específico por producto.</p>
        {[
          { name: 'Color',    values: ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde'], products: 4 },
          { name: 'Talle',    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],           products: 3 },
          { name: 'Material', values: ['Algodón', 'Poliéster', 'Lino'],              products: 1 },
        ].map((g) => (
          <div key={g.name} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{g.name}</span>
                <Badge variant="secondary" className="text-2xs">{g.products} productos</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-error transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.values.map((v) => (
                <div key={v} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs">
                  {v}
                  <button className="text-muted-foreground hover:text-error transition-colors ml-0.5"><X className="h-2.5 w-2.5" /></button>
                </div>
              ))}
              <button className="rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-foreground/30 transition-colors flex items-center gap-1">
                <Plus className="h-2.5 w-2.5" />Agregar
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Section: Stock ───────────────────────────────────────────────────────
  function renderStock() {
    return (
      <div className="p-5 pb-10 space-y-4 max-w-4xl mx-auto">
        <div className="flex gap-3 rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">2 productos con stock crítico (≤ 5 unidades). Revisá antes de recibir pedidos.</p>
        </div>
        <Toolbar placeholder="Buscar producto..." />
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Producto</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Stock</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Alerta en</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {PRODUCTS_DATA.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={p.stock === 0 ? 'text-error font-semibold' : p.stock <= 5 ? 'text-warning font-semibold' : 'text-foreground'}>{p.stock === 0 ? 'Sin stock' : p.stock}</span>
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground">5</td>
                  <td className="px-3 py-3 text-right">
                    <button className="text-xs font-medium" style={{ color: primaryColor }}>Reponer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Section: Envíos ──────────────────────────────────────────────────────
  function renderEnvios() {
    const methods = [
      { name: 'Envío a domicilio', price: 1500, time: '24–48hs',    active: true  },
      { name: 'Retiro en local',   price: 0,    time: 'A coordinar', active: true  },
      { name: 'Correo Argentino',  price: 2100, time: '3–5 días',   active: false },
    ]
    return (
      <div className="p-5 pb-10 space-y-5 max-w-4xl mx-auto">
        <div className="flex gap-1">
          {(['metodos', 'activos'] as const).map(t => (
            <button
              key={t}
              onClick={() => setEnviosTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                enviosTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t === 'metodos' ? 'Métodos de envío' : 'Envíos activos'}
            </button>
          ))}
        </div>

        {enviosTab === 'metodos' && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">El cliente elige al confirmar el pedido vía WhatsApp</p>
            {methods.map((m) => (
              <div key={m.name} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <Switch checked={m.active} className="scale-75 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.time} · {m.price === 0 ? 'Gratis' : fmt(m.price)}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <button className="w-full rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground hover:border-foreground/30 flex items-center justify-center gap-2 transition-colors">
              <Plus className="h-3.5 w-3.5" />Agregar método
            </button>
          </div>
        )}

        {enviosTab === 'activos' && (
          <div className="space-y-3">
            <Toolbar
              placeholder="Buscar por cliente o código..."
              extraFilters={
                <Select defaultValue="todos">
                  <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="preparing">En preparación</SelectItem>
                    <SelectItem value="in_transit">En camino</SelectItem>
                    <SelectItem value="delivered">Entregados</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Código</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Pedido</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Destinatario</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Estado</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Fecha</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground">Link tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {SHIPMENTS_DATA.map((s) => {
                    const st = SHIPMENT_STATUS_STYLE[s.status]
                    const isCopied = copiedCode === s.code
                    return (
                      <tr key={s.code} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3"><span className="font-mono font-semibold text-foreground">{s.code}</span></td>
                        <td className="px-3 py-3 font-mono text-muted-foreground hidden sm:table-cell">{s.orderId}</td>
                        <td className="px-3 py-3 font-medium">{s.recipient}</td>
                        <td className="px-3 py-3 text-center">
                          <Badge className={`text-2xs border ${st.cls}`} variant="outline">{st.label}</Badge>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{s.date}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => copyTracking(s.code)} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: isCopied ? '#22c55e' : primaryColor }}>
                            {isCopied ? <><Check className="h-3 w-3" />Copiado</> : <><Copy className="h-3 w-3" /><span className="hidden lg:inline">kitdigital.ar/tracking/</span>{s.code}</>}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-2xs text-muted-foreground">El link de tracking es público — cualquier persona con el código puede ver el estado del envío.</p>
          </div>
        )}
      </div>
    )
  }

  // ── Section: Finanzas ────────────────────────────────────────────────────
  function renderFinanzas() {
    return (
      <div className="p-5 pb-10 space-y-5 max-w-3xl mx-auto">
        <div className="flex justify-end">
          <Select value={finanzasPeriod} onValueChange={(v) => v && setFinanzasPeriod(v)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="mes_anterior">Mes anterior</SelectItem>
              <SelectItem value="ano">Este año</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Ingresos', value: '$284.500', color: 'text-success',    icon: TrendingUp   },
            { label: 'Gastos',   value: '$48.200',  color: 'text-error',      icon: TrendingDown },
            { label: 'Neto',     value: '$236.300', color: 'text-foreground', icon: DollarSign   },
          ].map((s) => (
            <Card key={s.label} className="border-border hover:shadow-xs transition-shadow">
              <CardContent className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xs text-muted-foreground uppercase tracking-wide font-medium">{s.label}</p>
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/60">
          <CardHeader className="px-5 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evolución mensual</CardTitle>
              <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success inline-block" />Ingresos</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-error inline-block" />Gastos</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="flex items-end gap-2 h-24">
              {[
                { mes: 'Ene', ing: 60, gas: 20 },
                { mes: 'Feb', ing: 75, gas: 25 },
                { mes: 'Mar', ing: 55, gas: 30 },
                { mes: 'Abr', ing: 90, gas: 17 },
              ].map((m) => (
                <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5 items-end">
                    <div className="flex-1 rounded-t bg-success/70 transition-all" style={{ height: `${m.ing}%` }} />
                    <div className="flex-1 rounded-t bg-error/50 transition-all" style={{ height: `${m.gas}%` }} />
                  </div>
                  <span className="text-2xs text-muted-foreground">{m.mes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Toolbar
            placeholder="Buscar movimiento..."
            extraFilters={
              <Select defaultValue="todos">
                <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ingreso">Ingresos</SelectItem>
                  <SelectItem value="egreso">Egresos</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/40">
              <p className="text-xs font-medium text-muted-foreground">Movimientos recientes</p>
            </div>
            {[
              { desc: 'Venta #0142', type: 'ingreso', amount: 18500, date: 'Hoy',   category: 'Venta'    },
              { desc: 'Venta #0141', type: 'ingreso', amount: 4500,  date: 'Hoy',   category: 'Venta'    },
              { desc: 'Packaging',   type: 'egreso',  amount: 3200,  date: 'Ayer',  category: 'Insumos'  },
              { desc: 'Venta #0139', type: 'ingreso', amount: 52000, date: 'Ayer',  category: 'Venta'    },
              { desc: 'Servicios',   type: 'egreso',  amount: 8500,  date: '10 abr',category: 'Servicios'},
            ].map((m, i) => (
              <div key={i} className="flex items-center px-4 py-2.5 border-b border-border/60 last:border-0 text-xs">
                <div className={`h-1.5 w-1.5 rounded-full mr-3 shrink-0 ${m.type === 'ingreso' ? 'bg-success' : 'bg-error'}`} />
                <span className="flex-1 font-medium">{m.desc}</span>
                <Badge variant="outline" className="text-2xs font-normal mr-3 hidden sm:flex">{m.category}</Badge>
                <span className="text-muted-foreground mr-4">{m.date}</span>
                <span className={`font-semibold ${m.type === 'ingreso' ? 'text-success' : 'text-error'}`}>
                  {m.type === 'ingreso' ? '+' : '-'}{fmt(m.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Section: Tareas ──────────────────────────────────────────────────────
  function renderTareas() {
    const tasks = [
      { label: 'Actualizar precios de temporada', done: false, priority: 'alta'  },
      { label: 'Subir fotos de nuevos productos', done: false, priority: 'media' },
      { label: 'Responder mensajes de Instagram', done: true,  priority: 'alta'  },
      { label: 'Hacer pedido de reposición',      done: false, priority: 'alta'  },
      { label: 'Configurar métodos de envío',     done: true,  priority: 'baja'  },
    ]
    const PRIO: Record<string, string> = { alta: 'text-error', media: 'text-warning', baja: 'text-muted-foreground' }
    return (
      <div className="p-5 pb-10 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input placeholder="Buscar tarea..." className="pl-9 h-9 text-sm" />
          </div>
          <p className="text-xs text-muted-foreground shrink-0">{tasks.filter(t => !t.done).length} pendientes</p>
        </div>
        <div className="space-y-1.5">
          {tasks.map((t, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors ${t.done ? 'opacity-50' : 'hover:border-foreground/20'}`}>
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${t.done ? 'border-primary bg-primary' : 'border-border'}`}>
                {t.done && <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className={`flex-1 text-xs ${t.done ? 'line-through text-muted-foreground' : 'font-medium'}`}>{t.label}</span>
              <span className={`text-2xs font-medium ${PRIO[t.priority]}`}>{t.priority}</span>
              <div className="flex items-center gap-1">
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-3 w-3" /></button>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-error transition-colors"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Section: Asistente IA ────────────────────────────────────────────────
  function renderAsistente() {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: primaryColor }}>
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold">Asistente KitDigital</p>
              <p className="text-2xs text-muted-foreground">GPT-4o-mini · Contexto de tu tienda</p>
            </div>
          </div>
          <Badge className="text-2xs bg-success/10 text-success border-success/20 gap-1 font-medium" variant="outline">
            <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />Activo
          </Badge>
        </div>

        {/* Suggested prompts */}
        <div className="px-5 py-3 border-b border-border/60 bg-muted/20 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
          {[
            'Pedidos pendientes',
            'Stock crítico',
            'Ventas de hoy',
            'Ayuda con precios',
          ].map(prompt => (
            <button
              key={prompt}
              className="whitespace-nowrap text-2xs font-medium px-3 py-1.5 rounded-full border border-border bg-white hover:border-foreground/20 hover:shadow-xs transition-all shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Messages */}
        <NativeScroll className="flex-1 px-5 py-4">
          <div className="space-y-4 max-w-2xl mx-auto">
            {AI_MESSAGES.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: primaryColor }}>
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed max-w-[80%] whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'text-white rounded-tr-sm'
                      : 'bg-white border border-border text-foreground rounded-tl-sm'
                  }`}
                  style={msg.role === 'user' ? { background: primaryColor } : {}}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {/* Typing indicator */}
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: primaryColor }}>
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                {[0,1,2].map(i => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                    style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </NativeScroll>

        {/* Input */}
        <div className="px-5 py-3 border-t border-border bg-white shrink-0">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <Input
              placeholder="Preguntale algo a tu asistente..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              className="h-10 text-sm flex-1"
            />
            <Button size="sm" className="h-10 w-10 p-0 shrink-0" disabled={!chatInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-2xs text-muted-foreground text-center mt-2">El asistente tiene acceso a tus pedidos, productos y stock en tiempo real.</p>
        </div>
      </div>
    )
  }

  const SECTION_RENDER: Record<Section, () => React.ReactNode> = {
    dashboard:    renderDashboard,
    ventas:       renderVentas,
    pedidos:      renderPedidos,
    caja_ahorro:  renderCajaAhorro,
    productos:    renderProductos,
    categorias:   renderCategorias,
    banners:      renderBanners,
    modulos:      renderModulos,
    configuracion:renderConfiguracion,
    stock:        renderStock,
    variantes:    renderVariantes,
    envios:       renderEnvios,
    finanzas:     renderFinanzas,
    tareas:       renderTareas,
    asistente:    renderAsistente,
  }

  const sectionLabel = allNavItems.find(n => n.section === section)?.label ?? section

  type TopbarAction = { label: string; action: () => void }
  const TOPBAR_ACTIONS: Partial<Record<Section, TopbarAction>> = {
    ventas:      { label: 'Registrar venta',  action: () => {} },
    productos:   { label: 'Nuevo producto',   action: () => { setEditProduct(null); setProductForm(true) } },
    caja_ahorro: { label: 'Nueva cuenta',     action: () => {} },
    finanzas:    { label: 'Registrar',        action: () => {} },
    tareas:      { label: 'Nueva tarea',      action: () => {} },
    categorias:  { label: 'Nueva categoría',  action: () => {} },
    variantes:   { label: 'Nuevo grupo',      action: () => {} },
    stock:       { label: 'Reponer stock',    action: () => {} },
    envios:      { label: 'Nuevo envío',      action: () => {} },
    banners:     { label: 'Nuevo banner',     action: () => {} },
  }

  return (
    <StoreThemeProvider
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      className="min-h-screen bg-[#f4f4f4]"
    >
      <div
        style={{ ['--design-nav-h' as never]: '40px', ['--admin-topbar-h' as never]: '48px' }}
        className="flex min-h-[calc(100dvh-var(--design-nav-h))]"
      >

        {/* ── SIDEBAR (desktop) ── */}
        <aside
          className="hidden lg:flex flex-col w-52 shrink-0 sticky top-[var(--design-nav-h)] h-[calc(100dvh-var(--design-nav-h))] self-start"
          style={{ background: primaryColor }}
        >
          {SidebarContent()}
        </aside>

        {/* ── SIDEBAR (mobile overlay) ── */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-52 p-0 min-h-0" style={{ background: primaryColor }}>
            <div className="pt-[var(--design-nav-h)] h-[calc(100dvh-var(--design-nav-h))]">
              {SidebarContent()}
            </div>
          </SheetContent>
        </Sheet>

        {/* ── MAIN ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top bar */}
          <div className="sticky top-[var(--design-nav-h)] z-40 border-b border-border bg-white shrink-0">
            <div className="h-12 w-full max-w-4xl mx-auto px-4 sm:px-5 flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-4 w-4" />
              </button>
              <h1 className="text-sm font-semibold flex-1">{sectionLabel}</h1>
              <div className="flex items-center gap-2">
                {TOPBAR_ACTIONS[section] && (
                  <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={TOPBAR_ACTIONS[section]!.action}>
                    <Plus className="h-3.5 w-3.5" />{TOPBAR_ACTIONS[section]!.label}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`flex-1 ${section === 'asistente' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}
               style={{ height: 'calc(100dvh - var(--design-nav-h) - var(--admin-topbar-h))' }}>
            <div className={`w-full mx-auto px-4 sm:px-5 ${section === 'asistente' ? 'h-full flex flex-col' : ''}`}>
              {SECTION_RENDER[section]?.()}
            </div>
          </div>
        </div>
      </div>

      {/* ── PRODUCT FORM SHEET ── */}
      <Sheet open={productForm} onOpenChange={setProductForm}>
        <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="text-sm font-semibold">
              {editProduct ? `Editar: ${editProduct.name}` : 'Nuevo producto'}
            </SheetTitle>
          </SheetHeader>
          <NativeScroll className="flex-1">
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Imágenes</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-foreground/30 transition-colors">
                    <Plus className="h-5 w-5 text-muted-foreground/40" />
                    <span className="text-2xs text-muted-foreground mt-1">Subir</span>
                  </div>
                  {editProduct && [1,2,3].map(i => (
                    <div key={i} className="aspect-square rounded-xl border border-border flex items-center justify-center relative group" style={{ background: secondaryColor }}>
                      <editProduct.Icon className="h-6 w-6" style={{ color: primaryColor, opacity: 0.2 }} />
                      <button className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Nombre <span className="text-error">*</span></Label>
                <Input defaultValue={editProduct?.name} placeholder="Ej: Remera básica negra" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Textarea placeholder="Descripción opcional..." rows={3} className="text-sm resize-none" defaultValue={editProduct ? 'Remera 100% algodón, corte recto.' : ''} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Precio <span className="text-error">*</span></Label>
                  <Input type="number" defaultValue={editProduct?.price} placeholder="0" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Precio tachado</Label>
                  <Input type="number" placeholder="0" className="h-9 text-sm" />
                </div>
              </div>
              {modules.wholesale && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Precio mayorista</Label>
                  <Input type="number" placeholder="0" className="h-9 text-sm" />
                  <p className="text-2xs text-muted-foreground">Se muestra en la tienda mayorista</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select defaultValue={editProduct?.cat.toLowerCase()}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccioná..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ropa">Ropa</SelectItem>
                    <SelectItem value="accesorios">Accesorios</SelectItem>
                    <SelectItem value="calzado">Calzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {modules.stock && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Stock inicial</Label>
                  <Input type="number" defaultValue={editProduct?.stock} placeholder="0" className="h-9 text-sm" />
                </div>
              )}
              {modules.variants && (
                <div className="space-y-2">
                  <Label className="text-xs">Grupos de variantes</Label>
                  <div className="space-y-2">
                    {['Color', 'Talle'].map((g) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-xs">{g}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-medium">Visible en vitrina</p>
                  <p className="text-2xs text-muted-foreground">Los clientes podrán verlo y comprarlo</p>
                </div>
                <Switch defaultChecked={editProduct?.visible ?? true} />
              </div>

              {/* Página interna — solo si módulo activo */}
              {modules.product_page && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-semibold">Página interna</p>
                        <p className="text-2xs text-muted-foreground">Página de detalle propia con SEO</p>
                      </div>
                    </div>
                    <Switch defaultChecked={editProduct ? (productPages[editProduct.id] ?? false) : false} />
                  </div>
                  <div className="space-y-3 pl-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Título SEO</Label>
                      <Input placeholder="Ej: Remera básica negra — Mi Tienda" className="h-9 text-sm" defaultValue={editProduct?.name} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Meta descripción</Label>
                      <Textarea placeholder="Descripción breve para buscadores..." rows={2} className="text-sm resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Especificaciones</Label>
                      <div className="space-y-2">
                        {['Material: Algodón 100%', 'Peso: 180gr'].map((spec, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input defaultValue={spec} className="h-8 text-xs flex-1" />
                            <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-error transition-colors"><X className="h-3 w-3" /></button>
                          </div>
                        ))}
                        <button className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors">
                          <Plus className="h-3 w-3" />Agregar especificación
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </NativeScroll>
          <div className="border-t border-border p-4 flex gap-2">
            <Button variant="outline" className="flex-1 text-sm" onClick={() => setProductForm(false)} disabled={savingProduct}>Cancelar</Button>
            <Button className="flex-1 text-sm gap-2" onClick={handleSaveProduct} disabled={savingProduct}>
              {savingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingProduct ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── ORDER DETAIL SHEET ── */}
      <Sheet open={!!orderDetail} onOpenChange={(o) => !o && setOrderDetail(null)}>
        <SheetContent side="right" className="w-full sm:w-[440px] flex flex-col p-0">
          {orderDetail && (() => {
            const currentStatus = orderStatuses[orderDetail.id] ?? orderDetail.status
            const ORDER_STEPS = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado'] as const
            const stepIdx = ORDER_STEPS.indexOf(currentStatus as typeof ORDER_STEPS[number])
            const NEXT_ACTIONS: Record<string, { label: string; next: string }> = {
              pendiente:  { label: 'Confirmar pedido',       next: 'confirmado' },
              confirmado: { label: 'Marcar como preparando', next: 'preparando' },
              preparando: { label: 'Marcar como enviado',    next: 'enviado'    },
              enviado:    { label: 'Marcar como entregado',  next: 'entregado'  },
            }
            const nextAction = NEXT_ACTIONS[currentStatus]

            return (
              <>
                <SheetHeader className="px-5 py-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-sm font-semibold">Pedido {orderDetail.id}</SheetTitle>
                    <Badge className={`text-xs border ${STATUS_STYLE[currentStatus] ?? STATUS_STYLE['pendiente']}`} variant="outline">{currentStatus}</Badge>
                  </div>
                </SheetHeader>
                <NativeScroll className="flex-1 p-5">
                  <div className="space-y-5">
                    {/* Cliente */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0" style={{ background: primaryColor }}>
                        {orderDetail.customer.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{orderDetail.customer}</p>
                        <p className="text-xs text-muted-foreground">{orderDetail.date} · {orderDetail.items} ítems</p>
                      </div>
                    </div>

                    {/* Timeline de estados */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado del pedido</p>
                      <div className="flex items-center gap-1">
                        {ORDER_STEPS.filter(s => s !== 'preparando').map((step, i, arr) => {
                          const sIdx = ORDER_STEPS.indexOf(step)
                          const isDone = stepIdx >= sIdx
                          const isLast = i === arr.length - 1
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <div
                                  className="h-6 w-6 rounded-full flex items-center justify-center border-2 transition-colors"
                                  style={isDone
                                    ? { background: primaryColor, borderColor: primaryColor }
                                    : { background: 'transparent', borderColor: '#e0e0e0' }}
                                >
                                  {isDone && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span className="text-2xs text-muted-foreground capitalize leading-tight text-center w-14 truncate">{step}</span>
                              </div>
                              {!isLast && (
                                <div
                                  className="h-0.5 flex-1 mx-1 rounded transition-colors mb-3"
                                  style={{ background: stepIdx > ORDER_STEPS.indexOf(step) ? primaryColor : '#e0e0e0' }}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Items del pedido */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Productos</p>
                      {PRODUCTS_DATA.slice(0, orderDetail.items).map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl border border-border shrink-0 flex items-center justify-center" style={{ background: secondaryColor }}>
                            <p.Icon className="h-5 w-5" style={{ color: primaryColor, opacity: 0.3 }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{p.name}</p>
                            <p className="text-2xs text-muted-foreground">x{idx === 0 ? 2 : 1} · {fmt(p.price)} c/u</p>
                          </div>
                          <span className="text-xs font-semibold shrink-0">{fmt(p.price * (idx === 0 ? 2 : 1))}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-t border-border">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="text-xl font-bold">{fmt(orderDetail.total)}</span>
                    </div>

                    {/* Seguimiento */}
                    {modules.shipping && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Seguimiento de envío</p>
                          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
                            <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono font-semibold">KD-C4X8R5</p>
                              <p className="text-2xs text-muted-foreground">En preparación</p>
                            </div>
                            <button
                              onClick={() => copyTracking('KD-C4X8R5')}
                              className="flex items-center gap-1 text-xs font-medium transition-colors shrink-0"
                              style={{ color: copiedCode === 'KD-C4X8R5' ? '#1a9e5c' : primaryColor }}
                            >
                              {copiedCode === 'KD-C4X8R5' ? <><Check className="h-3 w-3" />Copiado</> : <><Copy className="h-3 w-3" />Copiar link</>}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </NativeScroll>

                {/* Acciones */}
                <div className="border-t border-border p-4 space-y-2">
                  {nextAction && currentStatus !== 'entregado' && currentStatus !== 'cancelado' && (
                    <Button
                      className="w-full text-sm gap-2"
                      onClick={() => handleOrderStatusChange(orderDetail.id, nextAction.next)}
                    >
                      <Check className="h-4 w-4" />{nextAction.label}
                    </Button>
                  )}
                  {currentStatus === 'pendiente' && (
                    <Button
                      variant="outline"
                      className="w-full text-sm text-error hover:bg-error/5 border-error/30"
                      onClick={() => handleOrderStatusChange(orderDetail.id, 'cancelado')}
                    >
                      Cancelar pedido
                    </Button>
                  )}
                  {currentStatus === 'entregado' && (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-success font-medium">
                      <Check className="h-3.5 w-3.5" />Pedido completado
                    </div>
                  )}
                  {currentStatus === 'cancelado' && (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
                      Pedido cancelado
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

      {/* ── SAVINGS DETAIL SHEET ── */}
      <Sheet open={!!savingsDetail} onOpenChange={(o) => !o && setSavingsDetail(null)}>
        <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0">
          {savingsDetail && (
            <>
              <SheetHeader className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0" style={{ background: primaryColor }}>
                    {savingsDetail.name.charAt(0)}
                  </div>
                  <div>
                    <SheetTitle className="text-sm font-semibold">{savingsDetail.name}</SheetTitle>
                    <p className="text-xs text-muted-foreground">{savingsDetail.phone}</p>
                  </div>
                </div>
              </SheetHeader>
              <div className="px-5 py-4 border-b border-border bg-muted/30">
                <p className="text-2xs text-muted-foreground uppercase tracking-wide font-medium">Saldo actual</p>
                <p className={`text-2xl font-bold mt-0.5 ${savingsDetail.balance > 0 ? 'text-success' : savingsDetail.balance < 0 ? 'text-error' : 'text-foreground'}`}>
                  {savingsDetail.balance === 0 ? '$0' : `${savingsDetail.balance > 0 ? '+' : '-'}${fmt(savingsDetail.balance)}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {savingsDetail.balance > 0 ? 'El cliente tiene saldo a favor' : savingsDetail.balance < 0 ? 'El cliente debe este monto' : 'Saldo saldado'}
                </p>
              </div>
              <NativeScroll className="flex-1 p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Historial de movimientos</p>
                    <Button size="sm" className="h-7 text-xs gap-1"><Plus className="h-3 w-3" />Registrar</Button>
                  </div>
                  <div className="space-y-2">
                    {SAVINGS_MOVEMENTS.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.type === 'deposit' ? 'bg-success/10' : 'bg-error/10'}`}>
                          {m.type === 'deposit'
                            ? <TrendingUp className="h-3.5 w-3.5 text-success" />
                            : <TrendingDown className="h-3.5 w-3.5 text-error" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{m.desc}</p>
                          <p className="text-2xs text-muted-foreground">{m.date}</p>
                        </div>
                        <span className={`text-xs font-semibold ${m.type === 'deposit' ? 'text-success' : 'text-error'}`}>
                          {m.type === 'deposit' ? '+' : '-'}{fmt(m.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </NativeScroll>
            </>
          )}
        </SheetContent>
      </Sheet>

    </StoreThemeProvider>
  )
}
