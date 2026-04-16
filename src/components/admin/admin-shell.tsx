'use client'

import { useEffect, useMemo } from 'react'
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
  Tags,
  Receipt,
  AlertTriangle,
  Zap,
  Bot,
} from 'lucide-react'
import { toast } from 'sonner'
import { useBilling } from '@/lib/hooks/use-billing'

import { PanelShell, type PanelNavGroup } from '@/components/shared/panel-shell'
import { AdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys } from '@/lib/hooks/query-keys'
import { createClient } from '@/lib/supabase/client'
import type { StoreContext, ModuleName } from '@/lib/types'

function useActiveKey(): string {
  const pathname = usePathname()
  const segment = pathname.replace('/admin', '').split('/').filter(Boolean)[0] ?? ''

  const keyMap: Record<string, string> = {
    '': 'dashboard',
    products: 'products',
    categories: 'categories',
    orders: 'orders',
    customers: 'customers',
    settings: 'settings',
    banners: 'banners',
    stock: 'stock',
    shipping: 'shipping',
    payments: 'payments',
    tasks: 'tasks',
    finance: 'finance',
    expenses: 'expenses',
    savings: 'savings',
    multiuser: 'multiuser',
    domain: 'domain',
    billing: 'billing',
    assistant: 'assistant',
  }

  return keyMap[segment] ?? 'dashboard'
}

function buildNav(modules: Partial<Record<ModuleName, boolean>>): PanelNavGroup[] {
  const mod = (name: ModuleName) => modules[name] === true

  return [
    {
      label: 'PRINCIPALES',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
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
    const daysLeft = Math.max(
      0,
      Math.ceil(
        (new Date(billing.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    )
    if (daysLeft <= 3) {
      return (
        <Link
          href="/admin/billing"
          className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 font-medium hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Tu prueba gratis vence en {daysLeft} {daysLeft === 1 ? 'día' : 'días'}. Activá tu suscripción.
        </Link>
      )
    }
  }

  return null
}

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

  // Supabase Realtime — orders, payments, stock
  useEffect(() => {
    const supabase = createClient()

    const ordersChannel = supabase
      .channel(`orders-${storeId}`)
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
      .subscribe()

    const paymentsChannel = supabase
      .channel(`payments-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.payments(storeId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.orders(storeId) })
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(storeId) })
        }
      )
      .subscribe()

    const stockChannel = supabase
      .channel(`stock-${storeId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stock_items', filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.stock(storeId) })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(ordersChannel)
      void supabase.removeChannel(paymentsChannel)
      void supabase.removeChannel(stockChannel)
    }
  }, [storeId, queryClient])

  return (
    <AdminContext.Provider value={storeContext}>
      <PanelShell
        nav={nav}
        activeKey={activeKey}
        renderSidebarHeader={() => (
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sidebar-border">
            <span className="text-xs font-semibold truncate">Admin</span>
          </div>
        )}
        renderTopbar={() => <BillingBanner />}
      >
        {children}
      </PanelShell>
    </AdminContext.Provider>
  )
}
