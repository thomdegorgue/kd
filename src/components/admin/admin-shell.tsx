'use client'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Users,
  Settings,
  Blocks,
  Image,
  BarChart3,
  Wallet,
  PiggyBank,
  CheckSquare,
  UsersRound,
  Globe,
  CreditCard,
  Boxes,
  Truck,
  Receipt,
  AlertTriangle,
  Zap,
  Bot,
  Menu,
  ExternalLink,
  LogOut,
  ShoppingBag,
} from 'lucide-react'
import { toast } from 'sonner'
import { useBilling } from '@/lib/hooks/use-billing'
import { useStoreConfig } from '@/lib/hooks/use-store-config'
import { signOut } from '@/lib/actions/auth'

import { PanelShell, type PanelNavGroup } from '@/components/shared/panel-shell'
import { AdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys } from '@/lib/hooks/query-keys'
import { createClient } from '@/lib/supabase/client'
import type { StoreContext, ModuleName, StoreStatus, StoreConfig } from '@/lib/types'

// ============================================================
// HELPERS
// ============================================================

function getCatalogUrl(slug: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'
  return isDev ? `/${slug}` : `https://${slug}.${domain}`
}

// ============================================================
// HOOKS / UTILS
// ============================================================

function useActiveKey(): string {
  const pathname = usePathname()

  // Ordered from most specific (longest) to least specific so the first match wins
  const hrefToKey: Array<[string, string]> = [
    ['/admin/settings/modules', 'modules'],
    ['/admin/settings/team', 'multiuser'],
    ['/admin/settings/domain', 'domain'],
    ['/admin/settings', 'settings'],
    ['/admin/ventas', 'ventas'],
    ['/admin/products', 'products'],
    ['/admin/categories', 'categories'],
    ['/admin/orders', 'orders'],
    ['/admin/customers', 'customers'],
    ['/admin/banners', 'banners'],
    ['/admin/stock', 'stock'],
    ['/admin/shipping', 'shipping'],
    ['/admin/payments', 'payments'],
    ['/admin/tasks', 'tasks'],
    ['/admin/finance', 'finance'],
    ['/admin/expenses', 'expenses'],
    ['/admin/savings', 'savings'],
    ['/admin/wholesale', 'wholesale'],
    ['/admin/billing', 'billing'],
    ['/admin/assistant', 'assistant'],
    ['/admin', 'dashboard'],
  ]

  for (const [href, key] of hrefToKey) {
    if (pathname === href || pathname.startsWith(href + '/')) return key
  }
  return 'dashboard'
}

function buildNav(modules: Partial<Record<ModuleName, boolean>>): PanelNavGroup[] {
  const mod = (name: ModuleName) => modules[name] === true

  return [
    {
      label: 'PRINCIPALES',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
        { key: 'ventas', label: 'Ventas', icon: ShoppingBag, href: '/admin/ventas' },
        { key: 'orders', label: 'Pedidos', icon: ShoppingCart, href: '/admin/orders' },
        { key: 'customers', label: 'Clientes', icon: Users, href: '/admin/customers' },
      ],
    },
    {
      label: 'CATÁLOGO',
      items: [
        { key: 'products', label: 'Productos', icon: Package, href: '/admin/products' },
        { key: 'categories', label: 'Categorías', icon: FolderOpen, href: '/admin/categories' },
        ...(mod('banners')
          ? [{ key: 'banners', label: 'Banners', icon: Image, href: '/admin/banners' }]
          : []),
      ],
    },
    {
      label: 'GESTIÓN',
      items: [
        ...(mod('stock')
          ? [{ key: 'stock', label: 'Stock', icon: Boxes, href: '/admin/stock' }]
          : []),
        ...(mod('shipping')
          ? [{ key: 'shipping', label: 'Envíos', icon: Truck, href: '/admin/shipping' }]
          : []),
        ...(mod('payments')
          ? [{ key: 'payments', label: 'Pagos', icon: CreditCard, href: '/admin/payments' }]
          : []),
        ...(mod('tasks')
          ? [{ key: 'tasks', label: 'Tareas', icon: CheckSquare, href: '/admin/tasks' }]
          : []),
      ].filter(Boolean),
    },
    {
      label: 'FINANZAS',
      items: [
        ...(mod('finance')
          ? [{ key: 'finance', label: 'Finanzas', icon: BarChart3, href: '/admin/finance' }]
          : []),
        ...(mod('expenses')
          ? [{ key: 'expenses', label: 'Gastos', icon: Receipt, href: '/admin/expenses' }]
          : []),
        ...(mod('savings_account')
          ? [{ key: 'savings', label: 'Ahorros', icon: PiggyBank, href: '/admin/savings' }]
          : []),
      ],
    },
    {
      label: 'CONFIGURACIÓN',
      items: [
        { key: 'settings', label: 'Configuración', icon: Settings, href: '/admin/settings' },
        { key: 'modules', label: 'Módulos', icon: Blocks, href: '/admin/settings/modules' },
        ...(mod('multiuser')
          ? [{ key: 'multiuser', label: 'Equipo', icon: UsersRound, href: '/admin/settings/team' }]
          : []),
        ...(mod('custom_domain')
          ? [{ key: 'domain', label: 'Dominio', icon: Globe, href: '/admin/settings/domain' }]
          : []),
        ...(mod('wholesale')
          ? [{ key: 'wholesale', label: 'Mayorista', icon: Wallet, href: '/admin/wholesale' }]
          : []),
      ],
    },
    ...(mod('assistant')
      ? [
          {
            label: 'IA',
            items: [
              { key: 'assistant', label: 'Asistente IA', icon: Bot, href: '/admin/assistant' },
            ],
          },
        ]
      : []),
    {
      label: 'SUSCRIPCIÓN',
      items: [
        { key: 'billing', label: 'Billing', icon: Zap, href: '/admin/billing' },
      ],
    },
  ].filter((group) => group.items.length > 0)
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

const STATUS_BADGE: Record<StoreStatus, { label: string; className: string }> = {
  active: { label: 'ACTIVO', className: 'bg-green-100 text-green-700 border-green-200' },
  demo: { label: 'DEMO', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  past_due: { label: 'VENCIDO', className: 'bg-red-100 text-red-700 border-red-200' },
  suspended: { label: 'SUSPENDIDO', className: 'bg-red-100 text-red-700 border-red-200' },
  archived: { label: 'ARCHIVADO', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function StoreSidebarHeader({ storeContext }: { storeContext: StoreContext }) {
  const { data: store } = useStoreConfig()

  const config = (store?.config ?? {}) as StoreConfig
  const primaryColor = config.primary_color ?? '#1b1b1b'
  const logoUrl = store?.logo_url
  const storeName = store?.name ?? 'Mi tienda'
  const initial = storeName[0].toUpperCase()

  const displayStatus = storeContext.billing_status
  const badge = STATUS_BADGE[displayStatus] ?? { label: displayStatus.toUpperCase(), className: 'bg-gray-100 text-gray-600 border-gray-200' }

  return (
    <div className="flex items-center gap-2.5 px-3 py-3 border-b border-sidebar-border min-w-0">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-8 w-8 rounded-md object-cover shrink-0" />
      ) : (
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" title={storeName}>
          {storeName}
        </p>
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded border leading-none ${badge.className}`}>
          {badge.label}
        </span>
      </div>
    </div>
  )
}

function StoreSidebarFooter({ slug }: { slug: string }) {
  const catalogUrl = getCatalogUrl(slug)

  return (
    <div className="p-2 space-y-0.5">
      <a
        href={catalogUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold hover:bg-sidebar-accent/60 transition-colors"
      >
        <ExternalLink className="h-4 w-4 shrink-0 opacity-95" />
        Ver catálogo
      </a>
      <form action={signOut}>
        <button
          type="submit"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold hover:bg-sidebar-accent/60 transition-colors text-left"
        >
          <LogOut className="h-4 w-4 shrink-0 opacity-95" />
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}

function BillingBanner() {
  const { data } = useBilling()

  if (!data) return null

  const { billing } = data
  const status = billing.billing_status

  if (status === 'past_due') {
    return (
      <Link
        href="/admin/billing"
        className="flex items-center justify-center gap-2 bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-xs text-destructive font-medium hover:bg-destructive/15 transition-colors"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Tu suscripción está vencida. Actualizá tu método de pago para mantener el acceso.
      </Link>
    )
  }

  if (status === 'demo' && billing.trial_ends_at) {
    return (
      <Link
        href="/admin/billing"
        className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 font-medium hover:bg-amber-100 transition-colors"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        Estás en el período de prueba. Activá tu plan para seguir vendiendo →
      </Link>
    )
  }

  return null
}

function AdminTopbar({
  openMobile,
  activeLabel,
  slug,
}: {
  openMobile: () => void
  activeLabel: string
  slug: string
}) {
  const catalogUrl = getCatalogUrl(slug)

  return (
    <div className="shrink-0">
      <div className="h-11 bg-background border-b border-border flex items-center px-4 gap-3 sticky top-0 z-40">
        <button
          type="button"
          onClick={openMobile}
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-semibold flex-1 truncate">{activeLabel}</h1>
        <a
          href={catalogUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver catálogo
        </a>
      </div>
      <BillingBanner />
    </div>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function AdminShell({
  storeContext,
  children,
}: {
  storeContext: StoreContext
  children: React.ReactNode
}) {
  const activeKey = useActiveKey()
  const queryClient = useQueryClient()
  const storeId = storeContext.store_id

  const nav = useMemo(() => buildNav(storeContext.modules), [storeContext.modules])

  const activeLabel = useMemo(
    () => nav.flatMap((g) => g.items).find((i) => i.key === activeKey)?.label ?? 'Panel',
    [nav, activeKey],
  )

  // Supabase Realtime — 1 canal unificado para orders, payments y stock
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`store-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.orders(storeId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(storeId) })
          if (payload.eventType === 'INSERT') {
            toast('Nuevo pedido recibido', { description: 'Se registró un nuevo pedido.' })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.payments(storeId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.orders(storeId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(storeId) })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stock_items', filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.stock(storeId) })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [storeId, queryClient])

  return (
    <AdminContext.Provider value={storeContext}>
      <PanelShell
        nav={nav}
        activeKey={activeKey}
        renderSidebarHeader={() => <StoreSidebarHeader storeContext={storeContext} />}
        renderSidebarFooter={() => <StoreSidebarFooter slug={storeContext.slug} />}
        renderTopbar={({ openMobile }) => (
          <AdminTopbar
            openMobile={openMobile}
            activeLabel={activeLabel}
            slug={storeContext.slug}
          />
        )}
      >
        {children}
      </PanelShell>
    </AdminContext.Provider>
  )
}
