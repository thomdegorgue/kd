'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Store, Users, BarChart3, Settings, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col bg-muted border-r">
        <div className="flex h-14 items-center px-4 gap-2 border-b">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Superadmin</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive(href, exact)
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-3">
          <p className="text-xs text-muted-foreground">KitDigital.ar — Interno</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b px-6 bg-background">
          <span className="text-sm font-medium text-muted-foreground">Panel interno</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
