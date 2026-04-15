'use client'

import { usePathname } from 'next/navigation'
import { Store, Users, BarChart3, Settings, Zap } from 'lucide-react'
import { PanelShell, type PanelNavGroup } from '@/components/shared/panel-shell'

const NAV_ITEMS = [
  { href: '/superadmin', label: 'Dashboard', icon: BarChart3, exact: true },
  { href: '/superadmin/stores', label: 'Tiendas', icon: Store },
  { href: '/superadmin/users', label: 'Usuarios', icon: Users },
  { href: '/superadmin/plans', label: 'Planes', icon: Zap },
  { href: '/superadmin/settings', label: 'Config', icon: Settings },
]

interface SuperadminLayoutProps {
  children: React.ReactNode
}

export function SuperadminLayout({ children }: SuperadminLayoutProps) {
  const pathname = usePathname()

  const activeKey =
    NAV_ITEMS.find((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)))?.href ?? '/superadmin'

  const NAV: PanelNavGroup[] = [
    {
      items: NAV_ITEMS.map((i) => ({
        key: i.href,
        label: i.label,
        icon: i.icon,
        href: i.href,
      })),
    },
  ]

  return (
    <PanelShell
      nav={NAV}
      activeKey={activeKey}
      topOffsetClassName="top-0"
      className="min-h-screen"
      renderSidebarHeader={({ closeMobile }) => (
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="h-7 w-7 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">Superadmin</p>
            <p className="text-2xs text-sidebar-foreground/60 truncate">Panel interno</p>
          </div>
          <button
            type="button"
            onClick={closeMobile}
            className="ml-auto lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>
      )}
      renderTopbar={({ openMobile }) => (
        <div className="h-14 bg-background border-b border-border flex items-center px-6 gap-3 shrink-0 sticky top-0 z-40">
          <button
            type="button"
            onClick={openMobile}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Abrir menú"
          >
            <Zap className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">Panel interno</span>
        </div>
      )}
      renderMain={(content) => <main className="flex-1 overflow-y-auto p-6">{content}</main>}
    >
      {children}
    </PanelShell>
  )
}
