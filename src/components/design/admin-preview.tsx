'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LayoutDashboard, Package, Package2, ShoppingBag, Settings, TrendingUp,
  Plus, Search, Edit2, Trash2, MoreHorizontal, ChevronRight, Menu,
  GripVertical, Tag, Truck, DollarSign, Layers, Bot, Wallet,
  CheckSquare, Globe, BarChart2, Image as ImageIcon,
  Shirt, Footprints, Briefcase, X, Save,
  Receipt, Link2, Check, ArrowUpDown, Copy, AlertTriangle,
  TrendingDown, CreditCard, Banknote, Smartphone,
  HelpCircle, Users, FileText, Send, ExternalLink, Share2, Sparkles, Loader2,
  Download,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDateInput, getCalendarMonthRange } from '@/lib/design/date-range'
import { EntityToolbar, type AppliedEntityFilters } from '@/components/design/admin/entity-toolbar'
import { EntityListPagination, paginatedSlice } from '@/components/design/admin/entity-list-pagination'
import { downloadOrderReceiptPdf, type OrderReceiptLine } from '@/lib/design/order-receipt-pdf'

// ── Types & data ──────────────────────────────────────────────────────────────

type Section =
  | 'dashboard' | 'ventas' | 'pedidos' | 'cuenta_ahorro'
  | 'productos' | 'categorias' | 'banners'
  | 'modulos' | 'configuracion' | 'envios'
  | 'finanzas' | 'tareas' | 'asistente'

type OrderStatus = 'preparacion' | 'en_camino' | 'entregado'

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  preparacion: 'En preparación',
  en_camino: 'En camino',
  entregado: 'Entregado',
}

const ORDERS = [
  { id: '#0142', customer: 'María González', items: 3, total: 18500, status: 'preparacion' as const, date: 'Hoy 14:23'  },
  { id: '#0141', customer: 'Lucas Pérez',    items: 1, total: 4500,  status: 'preparacion' as const, date: 'Hoy 11:08'  },
  { id: '#0140', customer: 'Ana Ramírez',    items: 2, total: 28000, status: 'en_camino' as const,   date: 'Ayer 16:45' },
  { id: '#0139', customer: 'Carlos Medina',  items: 4, total: 52000, status: 'entregado' as const,   date: 'Ayer 09:12' },
  { id: '#0138', customer: 'Sofía Torres',   items: 1, total: 6800,  status: 'en_camino' as const,   date: '12 abr'     },
]

type ProductIcon = typeof Shirt
type ProductRow = {
  id: number
  name: string
  slug: string
  desc: string
  price: number
  /** Categoría principal (badge / compat) */
  cat: string
  /** Una o más categorías */
  cats: string[]
  visible: boolean
  stock: number
  Icon: ProductIcon
}

const PRODUCTS_DATA: ProductRow[] = [
  { id: 1, name: 'Remera básica',    slug: 'remera-basica',    desc: 'Remera 100% algodón', price: 4500,  cat: 'Ropa',       cats: ['Ropa'],       visible: true,  stock: 12, Icon: Shirt      },
  { id: 2, name: 'Pantalón cargo',   slug: 'pantalon-cargo',   desc: 'Tela ripstop',        price: 12000, cat: 'Ropa',       cats: ['Ropa'],       visible: true,  stock: 8,  Icon: Shirt      },
  { id: 3, name: 'Gorra snapback',   slug: 'gorra-snapback',   desc: 'Ajustable',           price: 6800,  cat: 'Accesorios', cats: ['Accesorios'], visible: true,  stock: 25, Icon: Briefcase  },
  { id: 4, name: 'Zapatillas urban', slug: 'zapatillas-urban', desc: 'Suela goma',          price: 28000, cat: 'Calzado',    cats: ['Calzado'],    visible: false, stock: 4,  Icon: Footprints },
  { id: 5, name: 'Buzo hoodie',      slug: 'buzo-hoodie',      desc: 'Capucha y canguro',   price: 15500, cat: 'Ropa',       cats: ['Ropa'],       visible: true,  stock: 6,  Icon: Shirt      },
  { id: 6, name: 'Riñonera',         slug: 'rinonera',         desc: 'Cierre YKK',          price: 8900,  cat: 'Accesorios', cats: ['Accesorios'], visible: true,  stock: 0,  Icon: Briefcase  },
]

const CATALOG_CATEGORY_OPTIONS: { id: string; label: string }[] = [
  { id: 'ropa', label: 'Ropa' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'calzado', label: 'Calzado' },
]

const VARIANT_COMBO_MAX_ROWS = 80

/** Paleta fija para elegir color al crear variantes tipo color (preview diseño). */
const VARIANT_COLOR_PALETTE: readonly string[] = [
  '#0A0A0A',
  '#FFFFFF',
  '#6B7280',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#059669',
  '#0891B2',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#92400E',
  '#365314',
  '#831843',
  '#1E3A8A',
  '#FDE68A',
  '#FECACA',
  '#BBF7D0',
  '#BFDBFE',
  '#E9D5FF',
  '#FBCFE8',
]

/** Pestañas del sheet Nuevo/Editar producto: lista sin marco ni padding; triggers compactos B/N. */
const PRODUCT_FORM_TABS_LIST_CLASS =
  'mb-3 !grid w-full max-w-full grid-cols-2 gap-1.5 !bg-transparent p-0 shadow-none rounded-none !h-auto min-h-0 items-stretch'

/** Gana sobre tabs.tsx (variant line) que fuerza data-active:bg-transparent en el trigger activo. */
const PRODUCT_FORM_TAB_TRIGGER_CLASS =
  'after:!hidden !h-8 !max-h-8 w-full shrink-0 !flex-none rounded-md border border-black bg-white px-5 py-0 text-[11px] font-semibold leading-tight text-black shadow-none transition-colors hover:bg-black/5 sm:!h-9 sm:!max-h-9 sm:text-xs aria-[selected=true]:!bg-black aria-[selected=true]:!text-white aria-[selected=true]:!border-black dark:aria-[selected=true]:!bg-black dark:aria-[selected=true]:!text-white group-data-[variant=line]/tabs-list:aria-[selected=true]:!bg-black group-data-[variant=line]/tabs-list:aria-[selected=true]:!text-white group-data-[variant=line]/tabs-list:aria-[selected=true]:!border-black dark:group-data-[variant=line]/tabs-list:aria-[selected=true]:!border-black dark:group-data-[variant=line]/tabs-list:aria-[selected=true]:!bg-black'

type VariantAxisKind = 'text' | 'color'

type VariantValue = { id: string; label: string; colorHex?: string }

type VariantAxis = {
  id: string
  name: string
  kind: VariantAxisKind
  values: VariantValue[]
}

type ProductDraft = {
  name: string
  desc: string
  slug: string
  price: string
  comparePrice: string
  wholesalePrice: string
  cats: string[]
  stockSimple: number
  visible: boolean
  internalPage: boolean
  usesVariants: boolean
  specs: string[]
  axes: VariantAxis[]
  stockByComboKey: Record<string, number>
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

type ComboPart = {
  axisId: string
  valueId: string
  label: string
  colorHex?: string
}

type ComboRow = { key: string; parts: ComboPart[] }

function buildComboRows(axes: VariantAxis[]): ComboRow[] {
  const active = axes.filter((a) => a.values.length > 0)
  if (active.length === 0) return []
  function rec(i: number, acc: ComboPart[]): ComboPart[][] {
    if (i >= active.length) return [acc]
    const axis = active[i]
    const rows: ComboPart[][] = []
    for (const v of axis.values) {
      const part: ComboPart =
        axis.kind === 'color' && v.colorHex
          ? {
              axisId: axis.id,
              valueId: v.id,
              label: v.label.trim() || v.colorHex,
              colorHex: v.colorHex,
            }
          : {
              axisId: axis.id,
              valueId: v.id,
              label: v.label,
            }
      rows.push(...rec(i + 1, [...acc, part]))
    }
    return rows
  }
  return rec(0, []).map((parts) => ({
    key: parts.map((p) => `${p.axisId}:${p.valueId}`).join('|'),
    parts,
  }))
}

function migrateStockMap(prev: Record<string, number>, newKeys: string[]): Record<string, number> {
  const next: Record<string, number> = {}
  for (const k of newKeys) {
    next[k] = k in prev ? prev[k] : 0
  }
  return next
}

/** Nombres internos de los únicos ejes “texto” y “color” (no se muestran como categorías al usuario). */
const VARIANT_AXIS_NAME_TEXT = 'Texto'
const VARIANT_AXIS_NAME_COLOR = 'Color'

function ensureAxisOfKind(
  axes: VariantAxis[],
  kind: VariantAxisKind,
  defaultName: string
): { axes: VariantAxis[]; axisId: string } {
  const found = axes.find((a) => a.kind === kind)
  if (found) return { axes, axisId: found.id }
  const id = newId('axis')
  return {
    axes: [...axes, { id, name: defaultName, kind, values: [] }],
    axisId: id,
  }
}

function normalizeAxesFromPersist(axes: VariantAxis[]): VariantAxis[] {
  return axes.map((a) =>
    (a as { kind?: string }).kind === 'size_preset' ? { ...a, kind: 'text' as const } : a
  )
}

function initProductDraft(
  p: ProductRow | null,
  productPages: Record<number, boolean>,
  variantPersist:
    | { axes: VariantAxis[]; stockByComboKey: Record<string, number>; usesVariants: boolean }
    | undefined
): ProductDraft {
  const cats =
    p?.cats.map((c) => CATALOG_CATEGORY_OPTIONS.find((o) => o.label === c)?.id ?? 'ropa') ?? ['ropa']
  const internal = p ? (productPages[p.id] ?? false) : false
  const axes = normalizeAxesFromPersist(variantPersist?.axes ?? [])
  const base: ProductDraft = {
    name: p?.name ?? '',
    desc: p?.desc ?? '',
    slug: p?.slug ?? '',
    price: p != null ? String(p.price) : '',
    comparePrice: '',
    wholesalePrice: '',
    cats: cats.length ? cats : ['ropa'],
    stockSimple: p?.stock ?? 0,
    visible: p?.visible ?? true,
    internalPage: internal,
    usesVariants: variantPersist?.usesVariants ?? false,
    specs: ['Material: Algodón 100%', 'Peso: 180gr'],
    axes,
    stockByComboKey: variantPersist?.stockByComboKey ?? {},
  }
  const keys = buildComboRows(axes).map((r) => r.key)
  return {
    ...base,
    stockByComboKey: migrateStockMap(base.stockByComboKey, keys),
  }
}

function buildOrderReceiptLines(order: (typeof ORDERS)[number]): OrderReceiptLine[] {
  const prods = PRODUCTS_DATA.slice(0, order.items)
  return prods.map((p, idx) => {
    const qty = idx === 0 ? 2 : 1
    return { name: p.name, qty, unitPrice: p.price, subtotal: p.price * qty }
  })
}

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

type BannerPreviewRow = {
  id: number
  title: string
  subtitle: string
  badge: string
  cta: string
  active: boolean
  /** Si hay URL, la vista previa replica el catálogo con foto de fondo */
  imageUrl?: string
}

const BANNERS_DATA: BannerPreviewRow[] = [
  { id: 1, title: 'Nueva colección',     subtitle: 'Piezas seleccionadas para esta temporada', badge: 'NUEVO',    cta: 'Ver colección', active: true  },
  { id: 2, title: 'Envío gratis',        subtitle: 'En compras mayores a $15.000',              badge: 'PROMO',    cta: 'https://wa.me/5491112345678?text=Hola', active: true  },
  { id: 3, title: 'Más de 50 productos', subtitle: 'Explorá todo el catálogo y encontrá tu estilo', badge: 'VER TODO', cta: 'Explorar',      active: false },
  { id: 4, title: '',                    subtitle: '',                                        badge: '',         cta: '',              active: true, imageUrl: '/logo.jpg' },
]

function bannerCtaIsLink(cta: string) {
  const t = cta.trim()
  return /^https?:\/\//i.test(t) || /^wa\.me\//i.test(t) || t.includes('whatsapp.com')
}

function bannerCtaHref(cta: string) {
  const t = cta.trim()
  if (/^https?:\/\//i.test(t)) return t
  if (/^wa\.me\//i.test(t) || t.includes('whatsapp.com')) return `https://${t.replace(/^\/+/, '')}`
  return '#'
}

const AI_MESSAGES = [
  { role: 'assistant', text: 'Hola. Soy tu asistente de KitDigital. ¿En qué te puedo ayudar hoy?' },
  { role: 'user',      text: '¿Cuáles son mis pedidos pendientes?' },
  { role: 'assistant', text: 'Tenés 3 pedidos pendientes hoy:\n• #0142 — María González — $18.500 (pendiente de confirmar)\n• #0141 — Lucas Pérez — $4.500 (para preparar)\n• #0138 — Sofía Torres — $6.800 (cancelación solicitada)\n¿Querés que te ayude a procesar alguno?' },
  { role: 'user',      text: '¿Qué productos tienen stock crítico?' },
  { role: 'assistant', text: '2 productos están por debajo del umbral de alerta (≤ 5 unidades):\n• Zapatillas urban — 4 unidades\n• Buzo hoodie — 6 unidades\n• Riñonera — Sin stock\n\nTe recomiendo hacer un pedido de reposición antes del fin de semana.' },
]

type TaskPriority = 'alta' | 'media' | 'baja'
type TaskRecord = {
  id: string
  label: string
  description: string
  done: boolean
  priority: TaskPriority
}

const TAREAS_SEED: TaskRecord[] = [
  {
    id: 't1',
    label: 'Actualizar precios de temporada',
    description:
      'Revisar márgenes por categoría, bundle de productos en oferta y alinear con la lista mayorista de abril. Dejar anotado qué ítems quedaron congelados.',
    done: false,
    priority: 'alta',
  },
  {
    id: 't2',
    label: 'Subir fotos de nuevos productos',
    description: 'Mismo encuadre y fondo neutro.',
    done: false,
    priority: 'media',
  },
  {
    id: 't3',
    label: 'Hacer pedido de reposición',
    description:
      'Sugerencia del sistema: remeras talle S/M bajas, zapatillas 40–42, y buzos capucha. Confirmar con proveedor antes del viernes.',
    done: false,
    priority: 'alta',
  },
  {
    id: 't4',
    label: 'Responder mensajes de Instagram',
    description: 'DM y comentarios en historias.',
    done: true,
    priority: 'alta',
  },
  {
    id: 't5',
    label: 'Configurar métodos de envío',
    description: 'Listo.',
    done: true,
    priority: 'baja',
  },
]

/** Badges solo con primary / muted / destructive (marca KitDigital) */
const STATUS_STYLE: Record<string, string> = {
  preparacion: 'bg-primary/10 text-foreground border-primary/25',
  en_camino:   'bg-muted text-foreground border-border',
  entregado:   'bg-secondary text-foreground border-border',
  cobrado:     'bg-primary/10 text-foreground border-primary/20',
  pendiente:   'bg-muted text-muted-foreground border-border',
}

const SHIPMENT_STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  preparing:  { label: 'En preparación', cls: 'bg-primary/10 text-foreground border-primary/20' },
  in_transit: { label: 'En camino',      cls: 'bg-muted text-foreground border-border' },
  delivered:  { label: 'Entregado',      cls: 'bg-secondary text-foreground border-border' },
}

const METHOD_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transf.',
  mp: 'Mercado Pago',
  debito: 'Débito',
  cuenta_ahorro: 'Cuenta de ahorro',
}

type PaymentMethodKey = 'efectivo' | 'transferencia' | 'debito' | 'mp' | 'cuenta_ahorro'

// Tiers: base (plan base) y pro (add-on)
const MODULE_CATALOG = [
  { key: 'banners',       label: 'Banners',            desc: 'Carrusel de imágenes en el catálogo',  tier: 'base', icon: ImageIcon   },
  { key: 'product_page',  label: 'Página de producto', desc: 'Detalle extendido e interno por producto', tier: 'base', icon: FileText   },
  { key: 'categories',    label: 'Categorías',         desc: 'Filtros de categoría en el catálogo',     tier: 'base', icon: Tag         },
  { key: 'stock',         label: 'Stock',              desc: 'Control de inventario',               tier: 'base', icon: Package2    },
  { key: 'variants',      label: 'Variantes',          desc: 'Talla, color, material',              tier: 'base', icon: ArrowUpDown },
  { key: 'shipping',      label: 'Envíos',             desc: 'Métodos de envío y tracking',         tier: 'base', icon: Truck       },
  { key: 'tasks',         label: 'Tareas',             desc: 'Gestión del equipo',                  tier: 'base', icon: CheckSquare },
  { key: 'payments',      label: 'Ventas',             desc: 'Registro de ventas y cobros (POS)',   tier: 'base', icon: Receipt     },
  { key: 'social',        label: 'Redes sociales',     desc: 'Links en el footer del catálogo',          tier: 'base', icon: Share2      },
  { key: 'wholesale',     label: 'Mayorista',          desc: 'Tienda mayorista separada',           tier: 'pro',  icon: BarChart2   },
  { key: 'finance',       label: 'Finanzas',           desc: 'Estadísticas de ingresos y gastos',   tier: 'pro',  icon: DollarSign  },
  { key: 'multiuser',     label: 'Multi-usuario',      desc: 'Roles y colaboradores',               tier: 'pro',  icon: Users       },
  { key: 'custom_domain', label: 'Dominio propio',     desc: 'dominio.com personalizado',           tier: 'base', icon: Globe       },
  { key: 'assistant',     label: 'Asistente IA',       desc: 'Chat con GPT-4o-mini',                tier: 'pro',  icon: Bot         },
]

const BASE_PRICE  = 20000
const PRO_PRICE   = 5000

function fmt(n: number) { return `$${Math.abs(n).toLocaleString('es-AR')}` }

const LIST_PAGE_SIZE = 50

/** Contenedor de sección — ancho real; el main limita a 1920px */
const SEC_Y4 = 'px-4 sm:px-5 py-4 pb-10 space-y-4'
const SEC_Y5 = 'px-4 sm:px-5 py-4 pb-10 space-y-5'
const SEC_Y6 = 'px-4 sm:px-5 py-4 pb-10 space-y-6'

const KD_TABLE_WRAP = 'rounded-xl border border-border overflow-hidden bg-card'
const KD_CARD_LIST = 'divide-y divide-border/60 rounded-xl border border-border overflow-hidden bg-card sm:hidden'
const KD_TABLE_ROW = 'border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors'

function defaultEntityDateRange(): Pick<AppliedEntityFilters, 'dateFrom' | 'dateTo'> {
  const { start, end } = getCalendarMonthRange()
  return { dateFrom: formatDateInput(start), dateTo: formatDateInput(end) }
}

function productCategoryFilterId(cat: string): string {
  if (cat === 'Accesorios') return 'accesorios'
  if (cat === 'Calzado') return 'calzado'
  return 'ropa'
}

function productMatchesCategoryFilters(p: ProductRow, selected: string[] | undefined): boolean {
  if (!selected?.length) return true
  return p.cats.some((c) => selected.includes(productCategoryFilterId(c)))
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminPreview() {
  const { storeName, logoUrl, primaryColor, secondaryColor, modules, toggleModule } = useDesignStore()
  const [section,         setSection]        = useState<Section>('dashboard')
  const [productForm,     setProductForm]    = useState(false)
  const [orderDetail,     setOrderDetail]    = useState<typeof ORDERS[0] | null>(null)
  const [editProduct,     setEditProduct]    = useState<ProductRow | null>(null)
  const [visibleProducts, setVisibleProducts]= useState<Record<number, boolean>>(
    Object.fromEntries(PRODUCTS_DATA.map(p => [p.id, p.visible]))
  )
  const [productPages,    setProductPages]   = useState<Record<number, boolean>>({ 1: true, 3: true })
  /** Datos de variantes por producto (preview): ejes + stock */
  const [variantDataByProductId, setVariantDataByProductId] = useState<
    Record<
      number,
      { axes: VariantAxis[]; stockByComboKey: Record<string, number>; usesVariants: boolean }
    >
  >({})
  const [productDraft, setProductDraft] = useState<ProductDraft>(() => initProductDraft(null, {}, undefined))
  const [productFormTab, setProductFormTab] = useState<
    'esencial' | 'opciones' | 'stock' | 'interna'
  >('esencial')
  const [variantAddMode, setVariantAddMode] = useState<VariantAxisKind>('text')
  const [variantTextInput, setVariantTextInput] = useState('')
  const [variantColorNameInput, setVariantColorNameInput] = useState('')
  const [variantColorHexPick, setVariantColorHexPick] = useState<string>(VARIANT_COLOR_PALETTE[0])
  const [sidebarOpen,     setSidebarOpen]    = useState(false)
  const [savingsDetail,   setSavingsDetail]  = useState<typeof SAVINGS_DATA[0] | null>(null)
  const [enviosTab,       setEnviosTab]      = useState<'metodos' | 'activos'>('metodos')
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

  type PosLine = { productId: number; name: string; price: number; qty: number }
  type PosAccount = { id: number; name: string; phone: string; note: string }
  const [posQuery, setPosQuery] = useState('')
  const [posLines, setPosLines] = useState<PosLine[]>([])
  const [payMethod, setPayMethod] = useState<PaymentMethodKey>('efectivo')
  const [posAccounts, setPosAccounts] = useState<PosAccount[]>(() =>
    SAVINGS_DATA.map((c) => ({ id: c.id, name: c.name, phone: c.phone, note: '' }))
  )
  const [selectedPosAccountId, setSelectedPosAccountId] = useState<number | null>(1)
  const [cuentaAltaOpen, setCuentaAltaOpen] = useState(false)
  const [newCuentaName, setNewCuentaName] = useState('')
  const [newCuentaNote, setNewCuentaNote] = useState('')
  const [newCuentaPhone, setNewCuentaPhone] = useState('')
  const [ventasListPage, setVentasListPage] = useState(1)
  const [productosListPage, setProductosListPage] = useState(1)
  const [pedidosListPage, setPedidosListPage] = useState(1)
  const [enviosListPage, setEnviosListPage] = useState(1)
  const [finanzasListPage, setFinanzasListPage] = useState(1)
  const [cuentaListPage, setCuentaListPage] = useState(1)
  const [tareasPendListPage, setTareasPendListPage] = useState(1)
  const [tareasDoneListPage, setTareasDoneListPage] = useState(1)
  const [orderPdfLoading, setOrderPdfLoading] = useState(false)

  const [productosSearch, setProductosSearch] = useState('')
  const [productosFilters, setProductosFilters] = useState<AppliedEntityFilters>(() => ({
    ...defaultEntityDateRange(),
    categories: ['ropa', 'accesorios', 'calzado'],
  }))
  const [pedidosSearch, setPedidosSearch] = useState('')
  const [pedidosFilters, setPedidosFilters] = useState<AppliedEntityFilters>(() => ({
    ...defaultEntityDateRange(),
    pedidosStatus: 'todos',
  }))
  const [ventasHistorialSearch, setVentasHistorialSearch] = useState('')
  const [ventasHistorialFilters, setVentasHistorialFilters] = useState<AppliedEntityFilters>(() => ({
    ...defaultEntityDateRange(),
    paymentMethod: 'todos',
  }))
  const [cuentaSearch, setCuentaSearch] = useState('')
  const [cuentaFilters, setCuentaFilters] = useState<AppliedEntityFilters>(() => ({ ...defaultEntityDateRange() }))
  const [enviosSearch, setEnviosSearch] = useState('')
  const [enviosFilters, setEnviosFilters] = useState<AppliedEntityFilters>(() => ({
    ...defaultEntityDateRange(),
    shipmentStatus: 'todos',
  }))
  const [finanzasSearch, setFinanzasSearch] = useState('')
  const [finanzasFilters, setFinanzasFilters] = useState<AppliedEntityFilters>(() => ({
    ...defaultEntityDateRange(),
    movementType: 'todos',
  }))
  const [bannersSearch, setBannersSearch] = useState('')
  const [bannersFilters, setBannersFilters] = useState<AppliedEntityFilters>(() => ({
    ...defaultEntityDateRange(),
    bannersActiveOnly: false,
  }))
  const [tareasSearch, setTareasSearch] = useState('')
  const [tareasFilters, setTareasFilters] = useState<AppliedEntityFilters>(() => ({
    ...defaultEntityDateRange(),
    tareasStatus: 'todas',
  }))
  const [tasks, setTasks] = useState<TaskRecord[]>(TAREAS_SEED)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskForm, setTaskForm] = useState<{
    id: string | null
    label: string
    description: string
    priority: TaskPriority
    done: boolean
  }>({ id: null, label: '', description: '', priority: 'media', done: false })

  useEffect(() => {
    setVentasListPage(1)
  }, [ventasHistorialSearch, ventasHistorialFilters])
  useEffect(() => {
    setProductosListPage(1)
  }, [productosSearch, productosFilters])
  useEffect(() => {
    setPedidosListPage(1)
  }, [pedidosSearch, pedidosFilters])
  useEffect(() => {
    setEnviosListPage(1)
  }, [enviosSearch, enviosFilters, enviosTab])
  useEffect(() => {
    setFinanzasListPage(1)
  }, [finanzasSearch, finanzasFilters])
  useEffect(() => {
    setCuentaListPage(1)
  }, [cuentaSearch, cuentaFilters])
  useEffect(() => {
    setTareasPendListPage(1)
    setTareasDoneListPage(1)
  }, [tareasSearch, tareasFilters])

  const productComboRows = useMemo(() => buildComboRows(productDraft.axes), [productDraft.axes])

  /** Solo “Esencial” si no hay Opciones, Stock ni pestaña Interna (módulo página de producto). */
  const productFormHasMultipleTabs =
    (modules.variants && productDraft.usesVariants) ||
    (modules.stock && modules.variants && productDraft.usesVariants) ||
    modules.product_page

  useEffect(() => {
    if (!productFormHasMultipleTabs && productFormTab !== 'esencial') {
      setProductFormTab('esencial')
    }
  }, [productFormHasMultipleTabs, productFormTab])

  useEffect(() => {
    if (productFormTab === 'opciones' && (!modules.variants || !productDraft.usesVariants)) {
      setProductFormTab('esencial')
    }
    if (
      productFormTab === 'stock' &&
      (!modules.stock || !modules.variants || !productDraft.usesVariants)
    ) {
      setProductFormTab('esencial')
    }
    if (productFormTab === 'interna' && !modules.product_page) {
      setProductFormTab('esencial')
    }
  }, [productFormTab, modules.stock, modules.variants, modules.product_page, productDraft.usesVariants])

  function openTaskEditor(task: TaskRecord | null) {
    if (task) {
      setTaskForm({
        id: task.id,
        label: task.label,
        description: task.description,
        priority: task.priority,
        done: task.done,
      })
    } else {
      setTaskForm({ id: null, label: '', description: '', priority: 'media', done: false })
    }
    setTaskDialogOpen(true)
  }

  function saveTaskFromDialog() {
    const label = taskForm.label.trim()
    if (!label) {
      toast.error('El título es obligatorio')
      return
    }
    const description = taskForm.description.trim()
    if (taskForm.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskForm.id
            ? { ...t, label, description, priority: taskForm.priority, done: taskForm.done }
            : t
        )
      )
      toast.success('Tarea actualizada (demo)')
    } else {
      setTasks((prev) => [
        ...prev,
        {
          id: `t-${Date.now()}`,
          label,
          description,
          priority: taskForm.priority,
          done: taskForm.done,
        },
      ])
      toast.success('Tarea creada (demo)')
    }
    setTaskDialogOpen(false)
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    toast.message('Tarea eliminada (demo)')
  }

  function toggleTaskDone(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function addPosLine(p: (typeof PRODUCTS_DATA)[number]) {
    setPosLines((lines) => {
      const i = lines.findIndex((l) => l.productId === p.id)
      if (i >= 0) {
        const next = [...lines]
        next[i] = { ...next[i], qty: next[i].qty + 1 }
        return next
      }
      return [...lines, { productId: p.id, name: p.name, price: p.price, qty: 1 }]
    })
  }

  function posProductMatches(p: (typeof PRODUCTS_DATA)[number], q: string) {
    const s = q.trim().toLowerCase()
    if (!s) return true
    return (
      p.name.toLowerCase().includes(s) ||
      p.slug.toLowerCase().includes(s) ||
      p.desc.toLowerCase().includes(s) ||
      p.cat.toLowerCase().includes(s) ||
      p.cats.some((c) => c.toLowerCase().includes(s))
    )
  }

  const posFiltered = PRODUCTS_DATA.filter((p) => posProductMatches(p, posQuery)).slice(0, 8)
  const posSubtotal = posLines.reduce((s, l) => s + l.price * l.qty, 0)

  function handleRegistrarVenta() {
    if (posLines.length === 0) {
      toast.error('Agregá al menos un producto', { description: 'Buscá y presioná Enter o tocá un ítem.' })
      return
    }
    if (payMethod === 'cuenta_ahorro' && !selectedPosAccountId) {
      toast.error('Elegí una cuenta de ahorro')
      return
    }
    toast.success('Venta registrada (demo)', {
      description:
        payMethod === 'cuenta_ahorro'
          ? `Pago pendiente en cuenta — ${posAccounts.find((a) => a.id === selectedPosAccountId)?.name ?? ''}`
          : METHOD_LABEL[payMethod],
    })
    setPosLines([])
    setPosQuery('')
  }

  function handleSaveNuevaCuenta() {
    const name = newCuentaName.trim()
    if (!name) {
      toast.error('El nombre es obligatorio')
      return
    }
    const id = Math.max(0, ...posAccounts.map((a) => a.id)) + 1
    setPosAccounts((prev) => [...prev, { id, name, phone: newCuentaPhone.trim(), note: newCuentaNote.trim() }])
    setSelectedPosAccountId(id)
    setCuentaAltaOpen(false)
    setNewCuentaName('')
    setNewCuentaNote('')
    setNewCuentaPhone('')
    toast.success('Cuenta de ahorro creada', { description: 'Podés gestionarla desde Cuenta de ahorro.' })
  }

  function copyTracking(code: string) {
    setCopiedCode(code)
    toast.success('Link copiado', { description: `kitdigital.ar/tracking/${code}` })
    setTimeout(() => setCopiedCode(null), 2000)
  }

  function handleSaveConfig() {
    setSavingConfig(true)
    setTimeout(() => {
      setSavingConfig(false)
      toast.success('Configuración guardada', { description: 'Los cambios se aplicarán en el catálogo.' })
    }, 700)
  }

  function handleSaveProduct() {
    setSavingProduct(true)
    setTimeout(() => {
      setSavingProduct(false)
      if (editProduct) {
        setProductPages((prev) => ({ ...prev, [editProduct.id]: productDraft.internalPage }))
        setVisibleProducts((prev) => ({ ...prev, [editProduct.id]: productDraft.visible }))
        setVariantDataByProductId((prev) => ({
          ...prev,
          [editProduct.id]: {
            axes: productDraft.axes,
            stockByComboKey: productDraft.stockByComboKey,
            usesVariants: productDraft.usesVariants,
          },
        }))
      }
      setProductForm(false)
      toast.success(editProduct ? 'Producto actualizado' : 'Producto creado', {
        description: 'Los cambios se reflejan en el catálogo.',
      })
    }, 600)
  }

  function openProductEditor(p: ProductRow | null) {
    setEditProduct(p)
    const persist = p ? variantDataByProductId[p.id] : undefined
    setProductDraft(initProductDraft(p, productPages, persist))
    setProductFormTab('esencial')
    setVariantAddMode('text')
    setVariantTextInput('')
    setVariantColorNameInput('')
    setVariantColorHexPick(VARIANT_COLOR_PALETTE[0])
    setProductForm(true)
  }

  function handleOrderStatusChange(orderId: string, newStatus: OrderStatus) {
    setOrderStatuses(prev => ({ ...prev, [orderId]: newStatus }))
    const labels: Record<OrderStatus, string> = {
      preparacion: 'En preparación',
      en_camino: 'En camino',
      entregado: 'Entregado',
    }
    toast.success(labels[newStatus], { description: `Pedido ${orderId}` })
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
        { section: 'cuenta_ahorro', icon: Wallet,        label: 'Cuenta de ahorro' },
      ],
    },
    {
      label: 'Catálogo',
      items: [
        { section: 'productos',  icon: Package,     label: 'Productos'  },
        { section: 'categorias', icon: Tag,         label: 'Categorías' },
        ...(modules.banners   ? [{ section: 'banners'   as Section, icon: ImageIcon,  label: 'Banners'   }] : []),
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
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-4 py-3 flex items-center gap-2.5 border-b backdrop-blur-md bg-black/10"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}
        >
          {logoUrl ? (
            <Image src={logoUrl} alt={storeName} width={28} height={28} className="rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {storeName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{storeName}</p>
            <p className="text-2xs text-white/75 truncate">Panel de gestión</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-full text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <NativeScroll className="flex-1 min-h-0 pt-1 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <nav className="px-2">
            {NAV_GROUPS.map((group, gi) => {
              if (group.items.length === 0) return null
              return (
                <div key={group.label}>
                  <p
                    className={`px-3 pb-2 text-2xs font-medium uppercase tracking-wider text-white/60 ${
                      gi === 0 ? 'pt-2' : 'pt-4'
                    }`}
                  >
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map(({ section: s, icon: Icon, label, badge }) => (
                      <button
                        key={s}
                        onClick={() => navigate(s)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors text-left text-white ${
                          section === s ? 'bg-white/15' : 'hover:bg-white/10'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-95" />
                        {label}
                        {badge && (
                          <span className="ml-auto text-[11px] text-white bg-white/20 rounded-full px-2 py-0.5 tabular-nums">
                            {badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </nav>
        </NativeScroll>
      </div>
    )
  }

  // ── Section: Dashboard ───────────────────────────────────────────────────
  function renderDashboard() {
    return (
      <div className={SEC_Y6}>
        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Ventas hoy',     value: '$48.500', sub: '+12% vs ayer',      icon: TrendingUp,  accent: true  },
            { label: 'Pedidos',        value: '8',       sub: '3 pendientes',      icon: ShoppingBag, accent: false },
            { label: 'Productos',      value: '24',      sub: '2 sin stock',       icon: Package,     accent: false },
            { label: 'Cuenta de ahorro', value: '4',    sub: '$17.300 pendiente', icon: Wallet,      accent: false },
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
            { label: 'Cuenta de ahorro', icon: Wallet,   action: () => navigate('cuenta_ahorro') },
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
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <BarChart2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">Tienda mayorista activa</p>
              <p className="text-2xs text-muted-foreground font-mono truncate">mayorista.kitdigital.ar/mi-tienda</p>
            </div>
            <button type="button" className="flex items-center gap-1 text-xs font-medium text-foreground shrink-0">
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
                <Badge className={`text-2xs border shrink-0 ${STATUS_STYLE[o.status] ?? ''}`} variant="outline">
                  {ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}
                </Badge>
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
    const totalEfectivo = VENTAS_DATA.filter((v) => v.method === 'efectivo').reduce((s, v) => s + v.total, 0)
    const totalTransf = VENTAS_DATA.filter((v) => v.method === 'transferencia').reduce((s, v) => s + v.total, 0)
    const totalMP = VENTAS_DATA.filter((v) => v.method === 'mp').reduce((s, v) => s + v.total, 0)
    const totalDebito = VENTAS_DATA.filter((v) => v.method === 'debito').reduce((s, v) => s + v.total, 0)
    const totalCuenta = VENTAS_DATA.filter((v) => v.method === 'cuenta_ahorro').reduce((s, v) => s + v.total, 0)
    const totalDia = VENTAS_DATA.reduce((s, v) => s + v.total, 0)

    const payOpts: { key: PaymentMethodKey; label: string; icon: React.ElementType }[] = [
      { key: 'efectivo', label: 'Efectivo', icon: Banknote },
      { key: 'transferencia', label: 'Transferencia', icon: CreditCard },
      { key: 'debito', label: 'Débito', icon: CreditCard },
      { key: 'mp', label: 'Mercado Pago', icon: Smartphone },
      { key: 'cuenta_ahorro', label: 'Cuenta de ahorro', icon: Wallet },
    ]

    const ventasFiltered = VENTAS_DATA.filter((v) => {
      const pm = ventasHistorialFilters.paymentMethod
      if (pm && pm !== 'todos' && v.method !== pm) return false
      const q = ventasHistorialSearch.trim().toLowerCase()
      if (!q) return true
      return (
        v.id.toLowerCase().includes(q) ||
        v.products.toLowerCase().includes(q) ||
        v.client.toLowerCase().includes(q)
      )
    })
    const { slice: ventasPaginated, totalPages: ventasTotalPages } = paginatedSlice(
      ventasFiltered,
      ventasListPage,
      LIST_PAGE_SIZE
    )

    return (
      <div className={SEC_Y6}>
        <Card className="border-border/60 shadow-xs">
          <CardContent className="px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Buscar producto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Ej: remera, rinonera, slug…"
                  className="pl-9 h-10 text-sm"
                  value={posQuery}
                  onChange={(e) => setPosQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    const first = PRODUCTS_DATA.find((p) => posProductMatches(p, posQuery))
                    if (first) {
                      if (modules.stock && first.stock === 0) {
                        toast.error('Sin stock', { description: first.name })
                        return
                      }
                      addPosLine(first)
                      toast.message('Agregado', { description: `${first.name} ×1` })
                    }
                  }}
                />
              </div>
              {posQuery.trim() && (
                <div className="rounded-lg border border-border divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {posFiltered.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground">Sin coincidencias</p>
                  ) : (
                    posFiltered.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (modules.stock && p.stock === 0) {
                            toast.error('Sin stock', { description: p.name })
                            return
                          }
                          addPosLine(p)
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                      >
                        <div
                          className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: secondaryColor }}
                        >
                          <p.Icon className="h-3.5 w-3.5" style={{ color: primaryColor, opacity: 0.45 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-2xs text-muted-foreground truncate font-mono">{p.slug}</p>
                        </div>
                        <span className="text-xs font-semibold shrink-0">{fmt(p.price)}</span>
                        {modules.stock && (
                          <span
                            className={`text-2xs shrink-0 ${p.stock === 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                          >
                            {p.stock === 0 ? 'Sin stock' : `${p.stock} u.`}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Ticket</p>
              {posLines.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Vacío — buscá y agregá productos</p>
              ) : (
                <ul className="space-y-2">
                  {posLines.map((l) => (
                    <li key={l.productId} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 font-medium truncate">{l.name}</span>
                      <div className="flex items-center gap-1 border border-border rounded-md bg-background">
                        <button
                          type="button"
                          className="px-2 py-1 hover:bg-muted rounded-l-md"
                          onClick={() =>
                            setPosLines((lines) =>
                              lines
                                .map((x) =>
                                  x.productId === l.productId ? { ...x, qty: Math.max(0, x.qty - 1) } : x
                                )
                                .filter((x) => x.qty > 0)
                            )
                          }
                        >
                          −
                        </button>
                        <span className="tabular-nums w-6 text-center">{l.qty}</span>
                        <button
                          type="button"
                          className="px-2 py-1 hover:bg-muted rounded-r-md"
                          onClick={() =>
                            setPosLines((lines) =>
                              lines.map((x) =>
                                x.productId === l.productId ? { ...x, qty: x.qty + 1 } : x
                              )
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                      <span className="font-semibold tabular-nums w-20 text-right">{fmt(l.price * l.qty)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Medio de pago</Label>
              <div className="flex flex-wrap gap-2">
                {payOpts.map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    type="button"
                    variant={payMethod === key ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 gap-1.5 text-xs rounded-lg"
                    onClick={() => setPayMethod(key)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
              {payMethod === 'cuenta_ahorro' && (
                <div className="space-y-2 bg-background">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cuenta</Label>
                    <Select
                      value={selectedPosAccountId != null ? String(selectedPosAccountId) : ''}
                      onValueChange={(v) => setSelectedPosAccountId(v ? Number(v) : null)}
                      disabled={posAccounts.length === 0}
                    >
                      <SelectTrigger className="h-9 text-xs w-full">
                        <SelectValue placeholder="Elegí una cuenta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {posAccounts.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-2"
                    onClick={() => setCuentaAltaOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nueva cuenta de ahorro
                  </Button>
                  <p className="text-2xs text-muted-foreground">
                    El cobro queda como pendiente en la cuenta elegida; lo gestionás en Cuenta de ahorro.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
              <p className="text-base font-bold">
                Total:{' '}
                <span className="tabular-nums" style={{ color: primaryColor }}>
                  {fmt(posSubtotal)}
                </span>
              </p>
              <Button type="button" className="gap-2 text-sm h-10 w-full sm:w-auto" onClick={handleRegistrarVenta}>
                <Check className="h-4 w-4" />
                Registrar venta
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {[
            { label: 'Efectivo', value: fmt(totalEfectivo), icon: Banknote },
            { label: 'Transf.', value: fmt(totalTransf), icon: CreditCard },
            { label: 'Débito', value: fmt(totalDebito), icon: CreditCard },
            { label: 'MP', value: fmt(totalMP), icon: Smartphone },
            { label: 'C. ahorro', value: fmt(totalCuenta), icon: Wallet },
            { label: 'Total día', value: fmt(totalDia), icon: TrendingUp },
          ].map((s) => (
            <Card key={s.label} className="border-border">
              <CardContent className="px-3 py-3 sm:px-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xs text-muted-foreground uppercase tracking-wide font-medium">{s.label}</p>
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="text-base sm:text-lg font-bold tabular-nums">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Movimientos del día</h3>
            <span className="text-2xs text-muted-foreground">Ventas y pedidos (demo)</span>
          </div>
          <EntityToolbar
            placeholder="Buscar en historial..."
            searchValue={ventasHistorialSearch}
            onSearchChange={setVentasHistorialSearch}
            filterPreset="ventas"
            appliedFilters={ventasHistorialFilters}
            onApplyFilters={setVentasHistorialFilters}
          />
          <div className={KD_CARD_LIST}>
            {ventasPaginated.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{v.id}</span>
                    <span className="text-xs font-medium truncate">{v.products}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge className={`text-2xs border ${STATUS_STYLE[v.status] ?? ''}`} variant="outline">
                      {v.status}
                    </Badge>
                    <Badge variant="outline" className="text-2xs font-normal">
                      {METHOD_LABEL[v.method] ?? v.method}
                    </Badge>
                  </div>
                </div>
                <span className="text-xs font-semibold shrink-0 tabular-nums">{fmt(v.total)}</span>
              </div>
            ))}
          </div>
          <div className={cn('hidden sm:block', KD_TABLE_WRAP)}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Hora</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Productos</th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                    Cliente
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Medio</th>
                  <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Total</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventasPaginated.map((v) => (
                  <tr key={v.id} className={KD_TABLE_ROW}>
                    <td className="px-4 py-3 font-mono font-medium text-muted-foreground">{v.id}</td>
                    <td className="px-3 py-3 text-muted-foreground">{v.time}</td>
                    <td className="px-3 py-3 font-medium truncate max-w-[140px]">{v.products}</td>
                    <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{v.client}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className="text-2xs font-normal">
                        {METHOD_LABEL[v.method] ?? v.method}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{fmt(v.total)}</td>
                    <td className="px-3 py-3 text-center">
                      <Badge className={`text-2xs border ${STATUS_STYLE[v.status] ?? ''}`} variant="outline">
                        {v.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <EntityListPagination page={ventasListPage} totalPages={ventasTotalPages} setPage={setVentasListPage} />
        </div>

        <Sheet open={cuentaAltaOpen} onOpenChange={setCuentaAltaOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
            <SheetHeader className="px-5 py-4 border-b border-border">
              <SheetTitle className="text-sm font-semibold">Nueva cuenta de ahorro</SheetTitle>
            </SheetHeader>
            <NativeScroll className="flex-1 p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre</Label>
                <Input
                  className="h-9 text-sm"
                  value={newCuentaName}
                  onChange={(e) => setNewCuentaName(e.target.value)}
                  placeholder="Ej: María — fiado"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observación (opcional)</Label>
                <Textarea
                  className="text-sm min-h-[72px]"
                  value={newCuentaNote}
                  onChange={(e) => setNewCuentaNote(e.target.value)}
                  placeholder="Nota interna"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono (opcional)</Label>
                <Input
                  className="h-9 text-sm"
                  value={newCuentaPhone}
                  onChange={(e) => setNewCuentaPhone(e.target.value)}
                  placeholder="+54 9 11 …"
                />
              </div>
            </NativeScroll>
            <div className="border-t border-border p-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCuentaAltaOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1" onClick={handleSaveNuevaCuenta}>
                Guardar
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // ── Section: Productos ───────────────────────────────────────────────────
  function renderProductos() {
    const productsFiltered = PRODUCTS_DATA.filter((p) => {
      if (!productMatchesCategoryFilters(p, productosFilters.categories)) return false
      const q = productosSearch.trim().toLowerCase()
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.cat.toLowerCase().includes(q) ||
        p.cats.some((c) => c.toLowerCase().includes(q))
      )
    })
    const { slice: productsPaged, totalPages: productosTotalPages } = paginatedSlice(
      productsFiltered,
      productosListPage,
      LIST_PAGE_SIZE
    )
    return (
      <div className={SEC_Y4}>
        <EntityToolbar
          placeholder="Buscar producto..."
          searchValue={productosSearch}
          onSearchChange={setProductosSearch}
          filterPreset="productos"
          appliedFilters={productosFilters}
          onApplyFilters={setProductosFilters}
        />

        {/* Mobile cards */}
        <div className={KD_CARD_LIST}>
          {productsPaged.map((p) => (
            <div key={p.id} onClick={() => openProductEditor(p)} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer">
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
        <div className={cn('hidden sm:block', KD_TABLE_WRAP)}>
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
              {productsPaged.map((p) => (
                <tr key={p.id} className={KD_TABLE_ROW}>
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
                      <button onClick={() => openProductEditor(p)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
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
        <EntityListPagination page={productosListPage} totalPages={productosTotalPages} setPage={setProductosListPage} />
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
      <div className={SEC_Y4}>
        <p className="text-xs text-muted-foreground">Ordená arrastrando · Los cambios se reflejan en el catálogo</p>
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
    const bannersListFiltered = BANNERS_DATA.filter((b) => {
      if (bannersFilters.bannersActiveOnly && !(bannersActive[b.id] ?? b.active)) return false
      const q = bannersSearch.trim().toLowerCase()
      if (!q) return true
      return (
        b.title.toLowerCase().includes(q) ||
        b.subtitle.toLowerCase().includes(q) ||
        b.cta.toLowerCase().includes(q) ||
        b.badge.toLowerCase().includes(q)
      )
    })
    return (
      <div className={SEC_Y4}>
        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <ImageIcon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
          <p className="text-xs text-muted-foreground leading-snug">
            El orden de esta lista es el del carrusel en el catálogo (mismo orden al deslizar en el celular). Activá o
            pausá cada pieza sin borrarla; podés usar solo imagen, o imagen más título y botón como en la tienda
            pública.
          </p>
        </div>
        <EntityToolbar
          placeholder="Buscar banner..."
          searchValue={bannersSearch}
          onSearchChange={setBannersSearch}
          filterPreset="banners"
          appliedFilters={bannersFilters}
          onApplyFilters={setBannersFilters}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bannersListFiltered.map((b) => {
            const imageUrl = b.imageUrl
            const hasTextOverlay =
              Boolean(b.badge?.trim()) ||
              Boolean(b.title?.trim()) ||
              Boolean(b.subtitle?.trim()) ||
              Boolean(b.cta?.trim())
            const ctaPreviewLabel = b.cta?.trim()
              ? bannerCtaIsLink(b.cta)
                ? 'Abrir enlace'
                : b.cta
              : ''

            return (
            <div
              key={b.id}
              className={cn(
                'group rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-xs flex flex-col',
                !(bannersActive[b.id] ?? b.active) && 'opacity-60'
              )}
            >
              <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border/60 bg-muted/30">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/80 transition-colors cursor-grab"
                  aria-label="Reordenar"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                {b.badge ? (
                  <Badge variant="outline" className="text-2xs font-medium uppercase tracking-wide">
                    {b.badge}
                  </Badge>
                ) : (
                  <span className="text-2xs text-muted-foreground">Sin etiqueta</span>
                )}
                <div className="flex-1" />
                <Switch
                  checked={bannersActive[b.id] ?? b.active}
                  onCheckedChange={(v) => setBannersActive((prev) => ({ ...prev, [b.id]: v }))}
                  className="scale-90"
                />
              </div>
              {/* Vista previa: mismo patrón que el catálogo (sin slider); fondo sólido o imagen */}
              <div className="relative h-52 w-full overflow-hidden border-b border-border/60">
                {imageUrl ? (
                  <div className="absolute inset-0">
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0" style={{ background: primaryColor }}>
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/8 pointer-events-none" />
                    <div className="absolute -left-12 -bottom-16 h-52 w-52 rounded-full bg-white/6 pointer-events-none" />
                    <div className="absolute right-1/4 top-4 h-24 w-24 rounded-full bg-white/4 pointer-events-none" />
                  </div>
                )}
                {imageUrl && hasTextOverlay ? (
                  <div className="pointer-events-none absolute inset-0 bg-black/35" aria-hidden />
                ) : null}
                {hasTextOverlay || !imageUrl ? (
                  <div className="absolute inset-0 flex items-center px-4 sm:px-8">
                    <div className="space-y-2 max-w-sm">
                      {hasTextOverlay ? (
                        <>
                          {b.badge?.trim() ? (
                            <span
                              className="inline-block text-2xs font-semibold tracking-widest uppercase px-2.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}
                            >
                              {b.badge}
                            </span>
                          ) : null}
                          {b.title?.trim() ? (
                            <h2 className="text-2xl font-semibold text-white leading-tight">{b.title}</h2>
                          ) : null}
                          {b.subtitle?.trim() ? (
                            <p className="text-sm text-white/75">{b.subtitle}</p>
                          ) : null}
                          {b.cta?.trim() ? (
                            <button
                              type="button"
                              className="mt-2 text-xs font-semibold px-4 py-1.5 rounded-full transition-opacity hover:opacity-90"
                              style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              {ctaPreviewLabel} →
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-xs text-white/85 pr-2">
                          Podés usar solo imagen; en el catálogo se ve igual que esta vista previa.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                {b.title ? <p className="text-xs font-semibold line-clamp-2">{b.title}</p> : null}
                {b.subtitle ? <p className="text-2xs text-muted-foreground line-clamp-2">{b.subtitle}</p> : null}
                <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                  {b.cta ? (
                    bannerCtaIsLink(b.cta) ? (
                      <a
                        href={bannerCtaHref(b.cta)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-2xs font-medium text-primary underline underline-offset-2 max-w-full break-all"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {b.cta}
                      </a>
                    ) : (
                      <Badge variant="secondary" className="text-2xs font-normal">
                        CTA: {b.cta}
                      </Badge>
                    )
                  ) : (
                    <span className="text-2xs text-muted-foreground">Sin CTA</span>
                  )}
                  {bannersActive[b.id] ?? b.active ? (
                    <Badge className="text-2xs bg-success/15 text-success border-success/25 border">Activo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-2xs text-muted-foreground">
                      Pausado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/60">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            )
          })}
          <button
            type="button"
            className="md:col-span-2 min-h-[140px] rounded-xl border-2 border-dashed border-border bg-muted/10 hover:bg-muted/25 hover:border-foreground/20 transition-colors flex flex-col items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-5 w-5 opacity-60" />
            Agregar banner
          </button>
        </div>
      </div>
    )
  }

  // ── Section: Pedidos ─────────────────────────────────────────────────────
  function renderPedidos() {
    const statusKey = pedidosFilters.pedidosStatus ?? 'todos'
    const filtered =
      statusKey === 'todos' ? ORDERS : ORDERS.filter((o) => o.status === statusKey)
    const pedidosFiltered = filtered.filter((o) => {
      const raw = pedidosSearch.trim().toLowerCase()
      if (!raw) return true
      const nq = raw.replace(/^#/, '')
      return (
        o.customer.toLowerCase().includes(raw) ||
        o.id.toLowerCase().includes(raw) ||
        o.id.replace('#', '').toLowerCase().includes(nq)
      )
    })
    const { slice: pedidosPaged, totalPages: pedidosTotalPages } = paginatedSlice(
      pedidosFiltered,
      pedidosListPage,
      LIST_PAGE_SIZE
    )
    return (
      <div className={SEC_Y4}>
        <EntityToolbar
          placeholder="Buscar por cliente o #pedido..."
          searchValue={pedidosSearch}
          onSearchChange={setPedidosSearch}
          filterPreset="pedidos"
          appliedFilters={pedidosFilters}
          onApplyFilters={setPedidosFilters}
        />

        {pedidosFiltered.length === 0 ? (
          <div className="rounded-xl border border-border py-16 flex flex-col items-center justify-center text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium">Sin pedidos en este estado</p>
            <p className="text-xs text-muted-foreground mt-1">Los pedidos archivados aparecerán aquí</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className={KD_CARD_LIST}>
              {pedidosPaged.map((o) => (
                <div key={o.id} onClick={() => setOrderDetail(o)} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold font-mono text-muted-foreground">{o.id}</span>
                      <span className="text-xs font-medium truncate">{o.customer}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`text-2xs border ${STATUS_STYLE[o.status] ?? ''}`} variant="outline">
                        {ORDER_STATUS_LABEL[o.status as OrderStatus]}
                      </Badge>
                      <span className="text-2xs text-muted-foreground">{o.date}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold shrink-0">{fmt(o.total)}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className={cn('hidden sm:block', KD_TABLE_WRAP)}>
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
                  {pedidosPaged.map((o) => (
                    <tr key={o.id} className={cn(KD_TABLE_ROW, 'cursor-pointer')} onClick={() => setOrderDetail(o)}>
                      <td className="px-4 py-3 font-mono font-medium text-muted-foreground">{o.id}</td>
                      <td className="px-3 py-3 font-medium">{o.customer}</td>
                      <td className="px-3 py-3 text-muted-foreground">{o.date}</td>
                      <td className="px-3 py-3 text-right font-semibold">{fmt(o.total)}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge className={`text-2xs border ${STATUS_STYLE[o.status] ?? ''}`} variant="outline">
                          {ORDER_STATUS_LABEL[o.status as OrderStatus]}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <EntityListPagination page={pedidosListPage} totalPages={pedidosTotalPages} setPage={setPedidosListPage} />
          </>
        )}
      </div>
    )
  }

  // ── Section: Cuenta de ahorro ──────────────────────────────────────────────
  function renderCajaAhorro() {
    const cuentaFiltered = SAVINGS_DATA.filter((c) => {
      const q = cuentaSearch.trim().toLowerCase()
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, '').toLowerCase().includes(q.replace(/\s/g, ''))
      )
    })
    const { slice: cuentaPaged, totalPages: cuentaTotalPages } = paginatedSlice(
      cuentaFiltered,
      cuentaListPage,
      LIST_PAGE_SIZE
    )
    return (
      <div className={SEC_Y4}>
        <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            1 cuenta con saldo negativo.{' '}
            <button
              type="button"
              className="underline font-medium text-foreground"
              onClick={() => setSavingsDetail(SAVINGS_DATA.find((c) => c.balance < 0) ?? null)}
            >
              Ver detalle
            </button>
          </p>
        </div>
        <EntityToolbar
          placeholder="Buscar cliente..."
          searchValue={cuentaSearch}
          onSearchChange={setCuentaSearch}
          filterPreset="cuenta"
          appliedFilters={cuentaFilters}
          onApplyFilters={setCuentaFilters}
        />
        <div className={KD_TABLE_WRAP}>
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
              {cuentaPaged.map((c) => (
                <tr key={c.id} className={cn(KD_TABLE_ROW, 'cursor-pointer')} onClick={() => setSavingsDetail(c)}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{c.name}</span>
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
        <EntityListPagination page={cuentaListPage} totalPages={cuentaTotalPages} setPage={setCuentaListPage} />
      </div>
    )
  }

  // ── Section: Módulos ─────────────────────────────────────────────────────
  function renderModulos() {
    const baseModules = MODULE_CATALOG.filter(m => m.tier === 'base')
    const proModules  = MODULE_CATALOG.filter(m => m.tier === 'pro')
    const activeProKeys = proModules.filter(m => modules[m.key as keyof typeof modules])
    const totalPrice = BASE_PRICE + activeProKeys.length * PRO_PRICE

    return (
      <div className={SEC_Y6}>

        {/* Free modules */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold">Incluidos en el plan base</p>
            <Badge variant="outline" className="text-2xs px-1.5 py-0 text-muted-foreground">base · $20.000/mes</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {baseModules.map((mod) => {
              const isOn = modules[mod.key as keyof typeof modules]
              return (
                <div
                  key={mod.key}
                  onClick={() => toggleModule(mod.key as Parameters<typeof toggleModule>[0])}
                  className={`flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors cursor-pointer select-none ${
                    isOn ? 'border-border shadow-sm' : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isOn ? '' : 'bg-muted'}`}
                    style={isOn ? { background: primaryColor } : {}}
                  >
                    <mod.icon className="h-3.5 w-3.5" style={{ color: isOn ? '#fff' : '#999' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold">{mod.label}</span>
                      <span className="text-2xs text-muted-foreground font-medium">incluido</span>
                    </div>
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
            <Badge variant="outline" className="text-2xs px-1.5 py-0 text-foreground border-foreground/20">+$5.000/mes c/u</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {proModules.map((mod) => {
              const isOn = modules[mod.key as keyof typeof modules]
              return (
                <div
                  key={mod.key}
                  onClick={() => toggleModule(mod.key as Parameters<typeof toggleModule>[0])}
                  className={`flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors cursor-pointer select-none ${
                    isOn ? 'border-border shadow-sm' : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isOn ? '' : 'bg-muted'}`}
                    style={isOn ? { background: primaryColor } : {}}
                  >
                    <mod.icon className="h-3.5 w-3.5" style={{ color: isOn ? '#fff' : '#999' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold">{mod.label}</span>
                      <span className="text-2xs text-muted-foreground font-medium">+{fmt(PRO_PRICE)}/mes</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{mod.desc}</p>
                  </div>
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isOn ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {isOn && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
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
                <p className="text-2xs text-muted-foreground">Incluye todos los módulos base</p>
              </div>
              <span className="text-xs font-semibold">{fmt(BASE_PRICE)}/mes</span>
            </div>
            {activeProKeys.map(mod => (
              <div key={mod.key} className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-muted-foreground" />{mod.label}
                </span>
                <span className="text-xs font-medium text-foreground">+{fmt(PRO_PRICE)}/mes</span>
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
      <div className="px-4 sm:px-5 py-4 pb-10 max-w-lg mx-auto space-y-5">
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
            <CardDescription className="text-xs">Afectan el catálogo y el panel admin</CardDescription>
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
              <CardDescription className="text-xs">Los links aparecen en el footer de tu catálogo</CardDescription>
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

        <div className="pt-6 space-y-3">
          <Button
            variant="outline"
            className="w-full justify-center gap-2 text-sm h-10"
            title="Soporte KitDigital"
          >
            <HelpCircle className="h-4 w-4" />
            Soporte
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-center h-10 text-xs text-muted-foreground hover:text-foreground"
          >
            Cerrar sesión
          </Button>
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
    const enviosFiltered = SHIPMENTS_DATA.filter((s) => {
      const st = enviosFilters.shipmentStatus
      if (st && st !== 'todos' && s.status !== st) return false
      const q = enviosSearch.trim().toLowerCase()
      if (!q) return true
      return (
        s.code.toLowerCase().includes(q) ||
        s.recipient.toLowerCase().includes(q) ||
        s.orderId.toLowerCase().includes(q)
      )
    })
    const { slice: enviosPaged, totalPages: enviosTotalPages } = paginatedSlice(
      enviosFiltered,
      enviosListPage,
      LIST_PAGE_SIZE
    )
    return (
      <div className={SEC_Y5}>
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
              <div key={m.name} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
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
            <EntityToolbar
              placeholder="Buscar por cliente o código..."
              searchValue={enviosSearch}
              onSearchChange={setEnviosSearch}
              filterPreset="envios"
              appliedFilters={enviosFilters}
              onApplyFilters={setEnviosFilters}
            />
            <div className="space-y-2 sm:hidden">
              {enviosPaged.map((s) => {
                const st = SHIPMENT_STATUS_STYLE[s.status]
                const isCopied = copiedCode === s.code
                return (
                  <div
                    key={s.code}
                    className="rounded-xl border border-border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">{s.code}</span>
                      <Badge className={`text-2xs border shrink-0 ${st.cls}`} variant="outline">
                        {st.label}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium">{s.recipient}</p>
                    <p className="text-2xs text-muted-foreground">
                      {s.orderId} · {s.date}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyTracking(s.code)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 py-2 text-xs font-medium transition-colors"
                      style={{ color: isCopied ? '#16a34a' : primaryColor }}
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar link de tracking
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className={cn('hidden sm:block', KD_TABLE_WRAP)}>
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
                  {enviosPaged.map((s) => {
                    const st = SHIPMENT_STATUS_STYLE[s.status]
                    const isCopied = copiedCode === s.code
                    return (
                      <tr key={s.code} className={KD_TABLE_ROW}>
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
            <EntityListPagination page={enviosListPage} totalPages={enviosTotalPages} setPage={setEnviosListPage} />
            <p className="text-2xs text-muted-foreground">El link de tracking es público — cualquier persona con el código puede ver el estado del envío.</p>
          </div>
        )}
      </div>
    )
  }

  // ── Section: Finanzas ────────────────────────────────────────────────────
  function renderFinanzas() {
    const finMovements = [
      { desc: 'Venta #0142', type: 'ingreso' as const, amount: 18500, date: 'Hoy', category: 'Venta' },
      { desc: 'Venta #0141', type: 'ingreso' as const, amount: 4500, date: 'Hoy', category: 'Venta' },
      { desc: 'Packaging', type: 'egreso' as const, amount: 3200, date: 'Ayer', category: 'Insumos' },
      { desc: 'Venta #0139', type: 'ingreso' as const, amount: 52000, date: 'Ayer', category: 'Venta' },
      { desc: 'Servicios', type: 'egreso' as const, amount: 8500, date: '10 abr', category: 'Servicios' },
    ]
    const finMovementsFiltered = finMovements.filter((m) => {
      const mt = finanzasFilters.movementType
      if (mt === 'ingreso' && m.type !== 'ingreso') return false
      if (mt === 'egreso' && m.type !== 'egreso') return false
      const q = finanzasSearch.trim().toLowerCase()
      if (!q) return true
      return m.desc.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    })
    const { slice: finMovementsPaged, totalPages: finanzasTotalPages } = paginatedSlice(
      finMovementsFiltered,
      finanzasListPage,
      LIST_PAGE_SIZE
    )
    return (
      <div className={SEC_Y5}>
        <p className="text-2xs text-muted-foreground">
          Rango:{' '}
          <span className="font-medium text-foreground tabular-nums">{finanzasFilters.dateFrom}</span>
          <span className="mx-1">—</span>
          <span className="font-medium text-foreground tabular-nums">{finanzasFilters.dateTo}</span>
          <span className="text-muted-foreground"> (definí fechas en Filtros)</span>
        </p>

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

        <div className="space-y-3">
          <EntityToolbar
            placeholder="Buscar movimiento..."
            searchValue={finanzasSearch}
            onSearchChange={setFinanzasSearch}
            filterPreset="finanzas"
            appliedFilters={finanzasFilters}
            onApplyFilters={setFinanzasFilters}
          />
          <div className={KD_TABLE_WRAP}>
            <div className="px-4 py-2.5 border-b border-border bg-muted/40">
              <p className="text-xs font-medium text-muted-foreground">Movimientos recientes</p>
            </div>
            {finMovementsPaged.map((m, i) => (
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
          <EntityListPagination page={finanzasListPage} totalPages={finanzasTotalPages} setPage={setFinanzasListPage} />
        </div>
      </div>
    )
  }

  // ── Section: Tareas ──────────────────────────────────────────────────────
  function renderTareas() {
    const PRIO: Record<TaskPriority, string> = {
      alta: 'text-error',
      media: 'text-warning',
      baja: 'text-muted-foreground',
    }
    const q = tareasSearch.trim().toLowerCase()
    const matches = (t: TaskRecord) => {
      if (!q) return true
      return t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    }
    const pending = tasks.filter((t) => !t.done && matches(t))
    const completed = tasks.filter((t) => t.done && matches(t))
    const mode = tareasFilters.tareasStatus ?? 'todas'
    const showPending = mode === 'todas' || mode === 'pendientes'
    const showCompleted = mode === 'todas' || mode === 'completadas'
    const { slice: pendingPaged, totalPages: tareasPendTotalPages } = paginatedSlice(
      pending,
      tareasPendListPage,
      LIST_PAGE_SIZE
    )
    const { slice: completedPaged, totalPages: tareasDoneTotalPages } = paginatedSlice(
      completed,
      tareasDoneListPage,
      LIST_PAGE_SIZE
    )

    function taskRow(t: TaskRecord) {
      return (
        <div
          key={t.id}
          className={cn(
            'flex gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors',
            t.done ? 'opacity-75' : 'hover:bg-muted/30'
          )}
        >
          <button
            type="button"
            onClick={() => toggleTaskDone(t.id)}
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
              t.done ? 'border-primary bg-primary' : 'border-border hover:border-muted-foreground/40'
            )}
            aria-label={t.done ? 'Marcar como pendiente' : 'Marcar como hecha'}
          >
            {t.done && (
              <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className={cn('text-xs font-medium leading-snug', t.done && 'line-through text-muted-foreground')}>
              {t.label}
            </p>
            {t.description ? (
              <p className={cn('text-2xs text-muted-foreground leading-relaxed', t.done && 'line-through')}>
                {t.description}
              </p>
            ) : null}
          </div>
          <span className={cn('text-2xs font-medium capitalize shrink-0 self-start pt-0.5', PRIO[t.priority])}>
            {t.priority}
          </span>
          <div className="flex items-center gap-0.5 shrink-0 self-start">
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => openTaskEditor(t)}
              aria-label="Editar tarea"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-error transition-colors"
              onClick={() => deleteTask(t.id)}
              aria-label="Eliminar tarea"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={SEC_Y4}>
        <EntityToolbar
          placeholder="Buscar por título o descripción..."
          searchValue={tareasSearch}
          onSearchChange={setTareasSearch}
          filterPreset="tareas"
          appliedFilters={tareasFilters}
          onApplyFilters={setTareasFilters}
        />
        <div className="space-y-6">
          {showPending && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {pending.length} pendiente{pending.length === 1 ? '' : 's'}
              </p>
              <div className="space-y-1.5">
                {pending.length === 0 ? (
                  <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg px-4 py-6 text-center">
                    No hay pendientes con este criterio.
                  </p>
                ) : (
                  pendingPaged.map(taskRow)
                )}
              </div>
              {pending.length > 0 ? (
                <EntityListPagination
                  page={tareasPendListPage}
                  totalPages={tareasPendTotalPages}
                  setPage={setTareasPendListPage}
                />
              ) : null}
            </div>
          )}
          {showCompleted && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {completed.length} completado{completed.length === 1 ? '' : 's'}
              </p>
              <div className="space-y-1.5">
                {completed.length === 0 ? (
                  <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg px-4 py-6 text-center">
                    No hay completadas con este criterio.
                  </p>
                ) : (
                  completedPaged.map(taskRow)
                )}
              </div>
              {completed.length > 0 ? (
                <EntityListPagination
                  page={tareasDoneListPage}
                  totalPages={tareasDoneTotalPages}
                  setPage={setTareasDoneListPage}
                />
              ) : null}
            </div>
          )}
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
          <Badge className="text-2xs border border-border gap-1 font-medium text-foreground" variant="outline">
            <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
            Activo
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
    cuenta_ahorro: renderCajaAhorro,
    productos:    renderProductos,
    categorias:   renderCategorias,
    banners:      renderBanners,
    modulos:      renderModulos,
    configuracion:renderConfiguracion,
    envios:       renderEnvios,
    finanzas:     renderFinanzas,
    tareas:       renderTareas,
    asistente:    renderAsistente,
  }

  const sectionLabel = allNavItems.find(n => n.section === section)?.label ?? section

  type TopbarAction = { label: string; action: () => void }
  const TOPBAR_ACTIONS: Partial<Record<Section, TopbarAction>> = {
    ventas:      { label: 'Registrar venta',  action: () => {} },
    productos:   { label: 'Nuevo producto',   action: () => openProductEditor(null) },
    cuenta_ahorro: { label: 'Nueva cuenta',   action: () => {} },
    finanzas:    { label: 'Registrar',        action: () => {} },
    tareas:      { label: 'Nueva tarea',      action: () => openTaskEditor(null) },
    categorias:  { label: 'Nueva categoría',  action: () => {} },
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
        style={{ ['--design-nav-h' as never]: '0px', ['--admin-topbar-h' as never]: '48px' }}
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
          <SheetContent
            side="left"
            className="p-0 min-h-0 overflow-hidden w-screen max-w-none data-[side=left]:w-screen data-[side=left]:max-w-none data-[side=left]:h-[100dvh] data-[side=left]:inset-y-0 data-[side=left]:left-0"
            style={{ background: primaryColor }}
            showCloseButton={false}
          >
            <div className="h-[100dvh] w-full">
              {SidebarContent()}
            </div>
          </SheetContent>
        </Sheet>

        {/* ── MAIN ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Top bar — pegada al borde superior del viewport; en lg empieza después del sidebar */}
          <div className="fixed top-0 right-0 z-40 border-b border-border bg-white shrink-0 left-0 lg:left-52">
            <div className="h-12 w-full px-4 sm:px-5 flex items-center gap-3">
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

          {/* Reserva altura de la topbar fija */}
          <div className="shrink-0 h-[var(--admin-topbar-h)]" aria-hidden />

          {/* Content */}
          <div
            className={`flex-1 min-h-0 ${section === 'asistente' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}
          >
            <div className={`w-full max-w-[1920px] mx-auto min-h-0 ${section === 'asistente' ? 'h-full flex flex-col' : ''}`}>
              {SECTION_RENDER[section]?.()}
            </div>
          </div>
        </div>
      </div>

      {/* ── TAREA (edición / alta) ── */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle className="text-sm font-semibold">
              {taskForm.id ? 'Editar tarea' : 'Nueva tarea'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-xs">
                Título
              </Label>
              <Input
                id="task-title"
                value={taskForm.label}
                onChange={(e) => setTaskForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ej. Revisar stock de remeras"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc" className="text-xs">
                Descripción
              </Label>
              <Textarea
                id="task-desc"
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Notas, enlaces o pasos (opcional)"
                rows={3}
                className="text-sm min-h-[72px] resize-y"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prioridad</Label>
              <Select
                value={taskForm.priority}
                onValueChange={(v) => {
                  if (v === 'alta' || v === 'media' || v === 'baja') {
                    setTaskForm((f) => ({ ...f, priority: v }))
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-xs font-medium">Completada</p>
                <p className="text-2xs text-muted-foreground">Marcá si ya está hecha</p>
              </div>
              <Switch
                checked={taskForm.done}
                onCheckedChange={(c) => setTaskForm((f) => ({ ...f, done: c }))}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-muted/30 sm:justify-end gap-2 px-5 py-3 !mx-0 !mb-0 rounded-none">
            <Button type="button" variant="outline" size="sm" onClick={() => setTaskDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={saveTaskFromDialog}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PRODUCT FORM SHEET ── */}
      <Sheet open={productForm} onOpenChange={setProductForm}>
        <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col min-h-0 p-0">
          <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-sm font-semibold">
              {editProduct ? `Editar: ${editProduct.name}` : 'Nuevo producto'}
            </SheetTitle>
          </SheetHeader>
          <NativeScroll className="flex-1 min-h-0">
            <div className="px-5">
              <Tabs
                value={productFormHasMultipleTabs ? productFormTab : 'esencial'}
                onValueChange={(v) =>
                  setProductFormTab(v as 'esencial' | 'opciones' | 'stock' | 'interna')
                }
                className="w-full"
              >
                {productFormHasMultipleTabs && (
                  <TabsList variant="line" className={PRODUCT_FORM_TABS_LIST_CLASS}>
                    <TabsTrigger value="esencial" className={PRODUCT_FORM_TAB_TRIGGER_CLASS}>
                      Esencial
                    </TabsTrigger>
                    {modules.variants && productDraft.usesVariants && (
                      <TabsTrigger value="opciones" className={PRODUCT_FORM_TAB_TRIGGER_CLASS}>
                        Opciones
                      </TabsTrigger>
                    )}
                    {modules.stock && modules.variants && productDraft.usesVariants && (
                      <TabsTrigger value="stock" className={PRODUCT_FORM_TAB_TRIGGER_CLASS}>
                        Stock
                      </TabsTrigger>
                    )}
                    {modules.product_page && (
                      <TabsTrigger value="interna" className={PRODUCT_FORM_TAB_TRIGGER_CLASS}>
                        Interna
                      </TabsTrigger>
                    )}
                  </TabsList>
                )}

                <TabsContent value="esencial" className="mt-0 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Imágenes</Label>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-foreground/30 transition-colors">
                        <Plus className="h-5 w-5 text-muted-foreground/40" />
                        <span className="text-2xs text-muted-foreground mt-1">Subir</span>
                      </div>
                      {editProduct &&
                        [1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-xl border border-border flex items-center justify-center relative group"
                            style={{ background: secondaryColor }}
                          >
                            <editProduct.Icon className="h-6 w-6" style={{ color: primaryColor, opacity: 0.2 }} />
                            <button
                              type="button"
                              className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-white" />
                            </button>
                          </div>
                        ))}
                    </div>
                    <p className="text-2xs text-muted-foreground">ImageUploader en F2</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Nombre <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={productDraft.name}
                      onChange={(e) => setProductDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Ej: Remera básica negra"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        Precio <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        value={productDraft.price}
                        onChange={(e) => setProductDraft((d) => ({ ...d, price: e.target.value }))}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Precio tachado</Label>
                      <Input
                        type="number"
                        value={productDraft.comparePrice}
                        onChange={(e) => setProductDraft((d) => ({ ...d, comparePrice: e.target.value }))}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  {modules.wholesale && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Precio mayorista</Label>
                      <Input
                        type="number"
                        value={productDraft.wholesalePrice}
                        onChange={(e) => setProductDraft((d) => ({ ...d, wholesalePrice: e.target.value }))}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                      <p className="text-2xs text-muted-foreground">Visible en tienda mayorista</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs">Categorías</Label>
                    <p className="text-2xs text-muted-foreground">Podés elegir más de una.</p>
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                      {CATALOG_CATEGORY_OPTIONS.map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-2.5 cursor-pointer text-xs font-medium"
                        >
                          <Checkbox
                            checked={productDraft.cats.includes(opt.id)}
                            onCheckedChange={() => {
                              setProductDraft((d) => {
                                const has = d.cats.includes(opt.id)
                                const next = has ? d.cats.filter((c) => c !== opt.id) : [...d.cats, opt.id]
                                return { ...d, cats: next.length ? next : ['ropa'] }
                              })
                            }}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium">Visible en catálogo</p>
                      <p className="text-2xs text-muted-foreground">Los clientes pueden verlo y pedirlo</p>
                    </div>
                    <Switch
                      checked={productDraft.visible}
                      onCheckedChange={(c) => setProductDraft((d) => ({ ...d, visible: c }))}
                    />
                  </div>
                  {modules.variants && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div>
                        <p className="text-xs font-medium">Este producto tiene variantes</p>
                        <p className="text-2xs text-muted-foreground">Agregá variantes en Opciones; el stock por combinación va en la pestaña Stock</p>
                      </div>
                      <Switch
                        checked={productDraft.usesVariants}
                        onCheckedChange={(c) => setProductDraft((d) => ({ ...d, usesVariants: c }))}
                      />
                    </div>
                  )}
                  {modules.stock && !productDraft.usesVariants && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Stock</Label>
                      <Input
                        type="number"
                        value={productDraft.stockSimple}
                        onChange={(e) =>
                          setProductDraft((d) => ({
                            ...d,
                            stockSimple: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  {modules.stock && productDraft.usesVariants && (
                    <p className="text-2xs text-muted-foreground rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2">
                      El stock por combinación se carga en la pestaña <span className="font-medium text-foreground">Stock</span>.
                    </p>
                  )}
                </TabsContent>

                {modules.variants && productDraft.usesVariants && (
                  <TabsContent value="opciones" className="mt-0 space-y-4">
                    <p className="text-2xs text-muted-foreground">
                      Elegí <span className="font-medium text-foreground">Texto</span> o{' '}
                      <span className="font-medium text-foreground">Color</span> y cargá cada variante directo: no hay
                      categorías ni pasos adentro. Las combinaciones para el stock se generan en la pestaña Stock.
                    </p>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        className={cn(
                          'h-9 rounded-md border border-black text-xs font-semibold transition-colors',
                          variantAddMode === 'text'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-black/5'
                        )}
                        onClick={() => setVariantAddMode('text')}
                      >
                        Texto
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'h-9 rounded-md border border-black text-xs font-semibold transition-colors',
                          variantAddMode === 'color'
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-black/5'
                        )}
                        onClick={() => setVariantAddMode('color')}
                      >
                        Color
                      </button>
                    </div>

                    {variantAddMode === 'text' && (
                      <div className="rounded-xl border border-border p-3 space-y-2.5">
                        <p className="text-2xs text-muted-foreground">
                          Talle, sabor, material… Lo que escribís es el valor.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            value={variantTextInput}
                            onChange={(e) => setVariantTextInput(e.target.value)}
                            placeholder='Ej. "XL", "Chocolate", "De acero"'
                            className="h-9 text-sm flex-1"
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return
                              e.preventDefault()
                              const t = variantTextInput.trim()
                              if (!t) return
                              setProductDraft((d) => {
                                const { axes: ax0, axisId } = ensureAxisOfKind(
                                  d.axes,
                                  'text',
                                  VARIANT_AXIS_NAME_TEXT
                                )
                                const vid = newId('v')
                                const axes = ax0.map((ax) =>
                                  ax.id !== axisId
                                    ? ax
                                    : { ...ax, values: [...ax.values, { id: vid, label: t }] }
                                )
                                const keys = buildComboRows(axes).map((r) => r.key)
                                return {
                                  ...d,
                                  axes,
                                  stockByComboKey: migrateStockMap(d.stockByComboKey, keys),
                                }
                              })
                              setVariantTextInput('')
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="shrink-0 w-full sm:w-auto"
                            onClick={() => {
                              const t = variantTextInput.trim()
                              if (!t) return
                              setProductDraft((d) => {
                                const { axes: ax0, axisId } = ensureAxisOfKind(
                                  d.axes,
                                  'text',
                                  VARIANT_AXIS_NAME_TEXT
                                )
                                const vid = newId('v')
                                const axes = ax0.map((ax) =>
                                  ax.id !== axisId
                                    ? ax
                                    : { ...ax, values: [...ax.values, { id: vid, label: t }] }
                                )
                                const keys = buildComboRows(axes).map((r) => r.key)
                                return {
                                  ...d,
                                  axes,
                                  stockByComboKey: migrateStockMap(d.stockByComboKey, keys),
                                }
                              })
                              setVariantTextInput('')
                            }}
                          >
                            Añadir
                          </Button>
                        </div>
                      </div>
                    )}

                    {variantAddMode === 'color' && (
                      <div className="rounded-xl border border-border p-3 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-2xs text-muted-foreground">Nombre del color</Label>
                          <Input
                            value={variantColorNameInput}
                            onChange={(e) => setVariantColorNameInput(e.target.value)}
                            placeholder="Ej. Rojo frambuesa"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-2xs text-muted-foreground">Paleta</Label>
                          <div className="grid grid-cols-7 gap-2 sm:grid-cols-8">
                            {VARIANT_COLOR_PALETTE.map((hex) => {
                              const selected =
                                variantColorHexPick.toUpperCase() === hex.toUpperCase()
                              return (
                                <button
                                  key={hex}
                                  type="button"
                                  title={hex}
                                  className={cn(
                                    'h-8 w-full max-w-[2rem] mx-auto rounded-full border transition-shadow',
                                    hex.toUpperCase() === '#FFFFFF'
                                      ? 'border-neutral-300'
                                      : 'border-black/20',
                                    selected
                                      ? 'ring-2 ring-black ring-offset-1'
                                      : 'hover:ring-1 hover:ring-black/25'
                                  )}
                                  style={{ backgroundColor: hex }}
                                  onClick={() => setVariantColorHexPick(hex)}
                                />
                              )
                            })}
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <Label className="text-2xs text-muted-foreground shrink-0">Otro tono</Label>
                            <input
                              type="color"
                              className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-0.5"
                              value={variantColorHexPick}
                              onChange={(e) => setVariantColorHexPick(e.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="w-full sm:w-auto"
                          disabled={!variantColorNameInput.trim()}
                          onClick={() => {
                            const name = variantColorNameInput.trim()
                            if (!name) return
                            const hex = variantColorHexPick.toUpperCase()
                            setProductDraft((d) => {
                              const { axes: ax0, axisId } = ensureAxisOfKind(
                                d.axes,
                                'color',
                                VARIANT_AXIS_NAME_COLOR
                              )
                              const vid = newId('v')
                              const axes = ax0.map((ax) =>
                                ax.id !== axisId
                                  ? ax
                                  : {
                                      ...ax,
                                      values: [...ax.values, { id: vid, label: name, colorHex: hex }],
                                    }
                              )
                              const keys = buildComboRows(axes).map((r) => r.key)
                              return {
                                ...d,
                                axes,
                                stockByComboKey: migrateStockMap(d.stockByComboKey, keys),
                              }
                            })
                            setVariantColorNameInput('')
                          }}
                        >
                          Agregar color
                        </Button>
                      </div>
                    )}

                    {(productDraft.axes.some((a) => a.kind === 'text' && a.values.length > 0) ||
                      productDraft.axes.some((a) => a.kind === 'color' && a.values.length > 0)) && (
                      <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-3">
                        <p className="text-xs font-semibold">Agregados</p>
                        {productDraft.axes.some((a) => a.kind === 'text' && a.values.length > 0) && (
                          <div className="space-y-1.5">
                            <p className="text-2xs font-medium text-muted-foreground">Texto</p>
                            <div className="flex flex-wrap gap-1.5">
                              {productDraft.axes.flatMap((axis) =>
                                axis.kind !== 'text'
                                  ? []
                                  : axis.values.map((v) => {
                                      const manyTextAxes =
                                        productDraft.axes.filter((x) => x.kind === 'text').length > 1
                                      return (
                                        <span
                                          key={v.id}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-2xs"
                                        >
                                          {manyTextAxes ? (
                                            <span className="text-muted-foreground">{axis.name} · </span>
                                          ) : null}
                                          <span>{v.label}</span>
                                          <button
                                            type="button"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                              setProductDraft((d) => {
                                                const axes = d.axes.map((ax) =>
                                                  ax.id !== axis.id
                                                    ? ax
                                                    : { ...ax, values: ax.values.filter((x) => x.id !== v.id) }
                                                )
                                                const keys = buildComboRows(axes).map((r) => r.key)
                                                return {
                                                  ...d,
                                                  axes,
                                                  stockByComboKey: migrateStockMap(d.stockByComboKey, keys),
                                                }
                                              })
                                            }
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      )
                                    })
                              )}
                            </div>
                          </div>
                        )}
                        {productDraft.axes.some((a) => a.kind === 'color' && a.values.length > 0) && (
                          <div className="space-y-1.5">
                            <p className="text-2xs font-medium text-muted-foreground">Color</p>
                            <div className="flex flex-wrap gap-1.5">
                              {productDraft.axes.flatMap((axis) =>
                                axis.kind !== 'color'
                                  ? []
                                  : axis.values.map((v) => {
                                      const manyColorAxes =
                                        productDraft.axes.filter((x) => x.kind === 'color').length > 1
                                      return (
                                        <span
                                          key={v.id}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 text-2xs"
                                        >
                                          {v.colorHex ? (
                                            <span
                                              className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/25"
                                              style={{ backgroundColor: v.colorHex }}
                                              aria-hidden
                                            />
                                          ) : null}
                                          {manyColorAxes ? (
                                            <span className="text-muted-foreground">{axis.name} · </span>
                                          ) : null}
                                          <span>{v.label}</span>
                                          <button
                                            type="button"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                              setProductDraft((d) => {
                                                const axes = d.axes.map((ax) =>
                                                  ax.id !== axis.id
                                                    ? ax
                                                    : { ...ax, values: ax.values.filter((x) => x.id !== v.id) }
                                                )
                                                const keys = buildComboRows(axes).map((r) => r.key)
                                                return {
                                                  ...d,
                                                  axes,
                                                  stockByComboKey: migrateStockMap(d.stockByComboKey, keys),
                                                }
                                              })
                                            }
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      )
                                    })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!modules.stock && (
                      <p className="text-2xs text-muted-foreground rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2">
                        Activá el módulo Stock en Módulos para cargar cantidades por combinación en la pestaña Stock.
                      </p>
                    )}
                    {productDraft.axes.length > 0 && productComboRows.length > VARIANT_COMBO_MAX_ROWS && (
                      <p className="text-2xs text-warning font-medium">
                        Hay más de {VARIANT_COMBO_MAX_ROWS} combinaciones. Reducí valores en algún eje para seguir editando con claridad.
                      </p>
                    )}
                  </TabsContent>
                )}

                {modules.stock && modules.variants && productDraft.usesVariants && (
                  <TabsContent value="stock" className="mt-0 space-y-4">
                    <p className="text-2xs text-muted-foreground">
                      Cada fila es una combinación de tus variantes. Por defecto en <span className="font-medium text-foreground">0</span>.
                    </p>
                    {productDraft.axes.length > 0 && productComboRows.length > VARIANT_COMBO_MAX_ROWS && (
                      <p className="text-2xs text-warning font-medium">
                        Hay más de {VARIANT_COMBO_MAX_ROWS} combinaciones. Reducí valores en Opciones para editar el stock con claridad.
                      </p>
                    )}

                    {productDraft.axes.some((a) => a.values.length > 0) &&
                      productComboRows.length > 0 &&
                      productComboRows.length <= VARIANT_COMBO_MAX_ROWS && (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Stock por combinación</Label>
                            <p className="text-2xs text-muted-foreground mt-0.5">
                              Una columna por cada eje (texto / color) más la cantidad.
                            </p>
                          </div>
                          <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-xs min-w-[280px]">
                              <thead>
                                <tr className="border-b border-border bg-muted/40">
                                  {productDraft.axes.map((a) => (
                                    <th
                                      key={a.id}
                                      className="px-3 py-2 text-left font-medium text-muted-foreground"
                                    >
                                      {a.name}
                                    </th>
                                  ))}
                                  <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">
                                    Stock
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {productComboRows.map((row) => (
                                  <tr key={row.key} className="border-b border-border/50 last:border-0">
                                    {row.parts.map((part, i) => (
                                      <td key={`${row.key}-${i}`} className="px-3 py-2">
                                        <span className="inline-flex items-center gap-1.5">
                                          {part.colorHex ? (
                                            <span
                                              className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/25"
                                              style={{ backgroundColor: part.colorHex }}
                                              aria-hidden
                                            />
                                          ) : null}
                                          {part.label}
                                        </span>
                                      </td>
                                    ))}
                                    <td className="px-3 py-2 text-right">
                                      <Input
                                        type="number"
                                        className="h-8 text-xs w-20 ml-auto text-right"
                                        value={productDraft.stockByComboKey[row.key] ?? 0}
                                        onChange={(e) => {
                                          const n = parseInt(e.target.value, 10) || 0
                                          setProductDraft((d) => ({
                                            ...d,
                                            stockByComboKey: { ...d.stockByComboKey, [row.key]: n },
                                          }))
                                        }}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="sm:hidden space-y-2">
                            {productComboRows.map((row) => (
                              <div
                                key={row.key}
                                className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2"
                              >
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs">
                                  {productDraft.axes.map((a, i) => {
                                    const part = row.parts[i]
                                    return (
                                      <span key={a.id}>
                                        <span className="text-muted-foreground">{a.name}: </span>
                                        <span className="font-medium inline-flex items-center gap-1">
                                          {part?.colorHex ? (
                                            <span
                                              className="h-3 w-3 shrink-0 rounded-sm border border-black/25"
                                              style={{ backgroundColor: part.colorHex }}
                                              aria-hidden
                                            />
                                          ) : null}
                                          {part?.label ?? '—'}
                                        </span>
                                      </span>
                                    )
                                  })}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-2xs text-muted-foreground">Stock</span>
                                  <Input
                                    type="number"
                                    className="h-9 text-sm w-24 text-right"
                                    value={productDraft.stockByComboKey[row.key] ?? 0}
                                    onChange={(e) => {
                                      const n = parseInt(e.target.value, 10) || 0
                                      setProductDraft((d) => ({
                                        ...d,
                                        stockByComboKey: { ...d.stockByComboKey, [row.key]: n },
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </TabsContent>
                )}

                {modules.product_page && (
                  <TabsContent value="interna" className="mt-0 space-y-4">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div>
                        <p className="text-xs font-medium">Página interna de producto</p>
                        <p className="text-2xs text-muted-foreground">
                          Modal de detalles en el catálogo (“Ver detalles”)
                        </p>
                      </div>
                      <Switch
                        checked={productDraft.internalPage}
                        onCheckedChange={(c) => setProductDraft((d) => ({ ...d, internalPage: c }))}
                      />
                    </div>
                    {!productDraft.internalPage && (
                      <p className="text-2xs text-muted-foreground">
                        Si está apagado, no se muestra “Ver detalles” y no se despliega el modal.
                      </p>
                    )}
                    {productDraft.internalPage && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Descripción</Label>
                          <Textarea
                            placeholder="Texto para el modal de detalles..."
                            rows={4}
                            className="text-sm resize-none"
                            value={productDraft.desc}
                            onChange={(e) => setProductDraft((d) => ({ ...d, desc: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Especificaciones</Label>
                          <div className="space-y-2">
                            {productDraft.specs.map((spec, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Input
                                  value={spec}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setProductDraft((d) => {
                                      const specs = [...d.specs]
                                      specs[i] = v
                                      return { ...d, specs }
                                    })
                                  }}
                                  className="h-8 text-xs flex-1"
                                />
                                <button
                                  type="button"
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                                  onClick={() =>
                                    setProductDraft((d) => ({
                                      ...d,
                                      specs: d.specs.filter((_, j) => j !== i),
                                    }))
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setProductDraft((d) => ({ ...d, specs: [...d.specs, ''] }))}
                            >
                              <Plus className="h-3 w-3" />
                              Agregar fila
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>
                )}
              </Tabs>
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
            const o = orderDetail
            const raw = orderStatuses[o.id] ?? o.status
            const currentStatus = raw as OrderStatus
            const ORDER_FLOW: OrderStatus[] = ['preparacion', 'en_camino', 'entregado']
            const stepIdx = ORDER_FLOW.indexOf(currentStatus)
            const NEXT_ACTIONS: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
              preparacion: { label: 'Marcar en camino', next: 'en_camino' },
              en_camino: { label: 'Marcar entregado', next: 'entregado' },
            }
            const nextAction = NEXT_ACTIONS[currentStatus]

            async function handleDownloadReceipt() {
              setOrderPdfLoading(true)
              try {
                const lines = buildOrderReceiptLines(o)
                const tracking =
                  modules.shipping
                    ? SHIPMENTS_DATA.find((s) => s.orderId === o.id)?.code
                    : undefined
                await downloadOrderReceiptPdf({
                  storeName,
                  logoUrl: logoUrl || null,
                  orderId: o.id,
                  customer: o.customer,
                  date: o.date,
                  statusLabel: ORDER_STATUS_LABEL[currentStatus],
                  lines,
                  total: o.total,
                  trackingCode: tracking,
                })
                toast.success('Comprobante descargado')
              } catch {
                toast.error('No se pudo generar el PDF')
              } finally {
                setOrderPdfLoading(false)
              }
            }

            return (
              <>
                <SheetHeader className="px-5 py-4 pr-14 border-b border-border">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                    <SheetTitle className="text-sm font-semibold">Pedido {o.id}</SheetTitle>
                    <Badge className={`text-2xs sm:text-xs border shrink-0 ${STATUS_STYLE[currentStatus] ?? ''}`} variant="outline">
                      {ORDER_STATUS_LABEL[currentStatus]}
                    </Badge>
                  </div>
                </SheetHeader>
                <NativeScroll className="flex-1 p-5">
                  <div className="space-y-5">
                    {/* Cliente — sin avatar (cuentas sin foto en demo) */}
                    <div>
                      <p className="text-sm font-semibold">{o.customer}</p>
                      <p className="text-xs text-muted-foreground">{o.date} · {o.items} ítems</p>
                    </div>

                    {/* Timeline — 3 estados (grid: evita que se corten las líneas en mobile) */}
                    <div className="space-y-2 w-full min-w-0 overflow-x-hidden">
                      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Estado del pedido
                      </p>
                      <div
                        className="grid w-full max-w-full items-center gap-x-0.5 sm:gap-x-1.5"
                        style={{
                          gridTemplateColumns:
                            'minmax(0,1fr) minmax(14px,0.9fr) minmax(0,1fr) minmax(14px,0.9fr) minmax(0,1fr)',
                        }}
                      >
                        {ORDER_FLOW.map((step, i) => {
                          const sIdx = ORDER_FLOW.indexOf(step)
                          const isDone = stepIdx >= sIdx
                          const isLast = i === ORDER_FLOW.length - 1
                          return (
                            <Fragment key={step}>
                              <div className="flex flex-col items-center gap-1 min-w-0">
                                <div
                                  className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors"
                                  style={
                                    isDone
                                      ? { background: primaryColor, borderColor: primaryColor }
                                      : { background: 'transparent', borderColor: 'var(--border)' }
                                  }
                                >
                                  {isDone && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />}
                                </div>
                                <span className="text-[9px] sm:text-2xs text-muted-foreground leading-tight text-center px-0.5 line-clamp-2 w-full">
                                  {ORDER_STATUS_LABEL[step]}
                                </span>
                              </div>
                              {!isLast && (
                                <div
                                  className="h-[2px] w-full min-w-[12px] rounded-full self-center"
                                  style={{
                                    background: stepIdx > sIdx ? primaryColor : 'var(--border)',
                                  }}
                                />
                              )}
                            </Fragment>
                          )
                        })}
                      </div>
                    </div>

                    <Separator />

                    {/* Items del pedido */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Productos</p>
                      {PRODUCTS_DATA.slice(0, o.items).map((p, idx) => (
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
                      <span className="text-xl font-bold">{fmt(o.total)}</span>
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
                              type="button"
                              onClick={() => copyTracking('KD-C4X8R5')}
                              className="flex items-center gap-1 text-xs font-medium transition-colors shrink-0"
                              style={{ color: primaryColor }}
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
                  {nextAction && currentStatus !== 'entregado' && (
                    <Button
                      type="button"
                      className="w-full text-sm gap-2"
                      onClick={() => handleOrderStatusChange(o.id, nextAction.next)}
                    >
                      <Check className="h-4 w-4" />
                      {nextAction.label}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-sm gap-2"
                    disabled={orderPdfLoading}
                    onClick={() => void handleDownloadReceipt()}
                  >
                    {orderPdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Descargar comprobante
                  </Button>
                  {currentStatus === 'entregado' && (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs font-medium text-foreground">
                      <Check className="h-3.5 w-3.5" />
                      Pedido entregado
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
              <SheetHeader className="px-5 py-4 border-b border-border space-y-1">
                <SheetTitle className="text-sm font-semibold">{savingsDetail.name}</SheetTitle>
                <p className="text-xs text-muted-foreground font-mono">{savingsDetail.phone}</p>
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
