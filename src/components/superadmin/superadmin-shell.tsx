'use client'

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import {
  LayoutDashboard,
  Store,
  Users,
  Zap,
  ListChecks,
  Webhook,
} from 'lucide-react'
import { PanelShell, type PanelNavGroup } from '@/components/shared/panel-shell'

function useActiveKey(): string {
  const pathname = usePathname()
  const segment = pathname.replace('/superadmin', '').split('/').filter(Boolean)[0] ?? ''

  const keyMap: Record<string, string> = {
    '': 'dashboard',
    stores: 'stores',
    users: 'users',
    plan: 'plan',
    events: 'events',
    webhooks: 'webhooks',
  }
  return keyMap[segment] ?? 'dashboard'
}

const NAV: PanelNavGroup[] = [
  {
    label: 'PRINCIPAL',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/superadmin' },
    ],
  },
  {
    label: 'TIENDAS',
    items: [
      { key: 'stores', label: 'Tiendas', icon: Store, href: '/superadmin/stores' },
      { key: 'users', label: 'Usuarios', icon: Users, href: '/superadmin/users' },
    ],
  },
  {
    label: 'CONFIGURACIÓN',
    items: [
      { key: 'plan', label: 'Plan & Precios', icon: Zap, href: '/superadmin/plan' },
    ],
  },
  {
    label: 'AUDITORÍA',
    items: [
      { key: 'events', label: 'Eventos', icon: ListChecks, href: '/superadmin/events' },
      { key: 'webhooks', label: 'Webhooks MP', icon: Webhook, href: '/superadmin/webhooks' },
    ],
  },
]

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const activeKey = useActiveKey()
  const nav = useMemo(() => NAV, [])

  return (
    <PanelShell
      nav={nav}
      activeKey={activeKey}
      renderSidebarHeader={() => (
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sidebar-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Superadmin
          </span>
        </div>
      )}
    >
      {children}
    </PanelShell>
  )
}
