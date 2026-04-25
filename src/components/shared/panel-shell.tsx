'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export type PanelNavItem = {
  key: string
  label: string
  icon?: LucideIcon
  href?: string
  badge?: React.ReactNode
  onSelect?: () => void
}

export type PanelNavGroup = {
  label?: string
  items: PanelNavItem[]
}

type SidebarRenderProps = {
  closeMobile: () => void
}

export function PanelShell(props: {
  nav: PanelNavGroup[]
  activeKey?: string
  className?: string
  topOffsetClassName?: string
  /** Header del sidebar (logo/store name/etc.) */
  renderSidebarHeader?: (p: SidebarRenderProps) => React.ReactNode
  /** Footer del sidebar (opcional) */
  renderSidebarFooter?: () => React.ReactNode
  /** Contenido del topbar sticky */
  renderTopbar?: (p: { openMobile: () => void }) => React.ReactNode
  /** Si querés reemplazar el contenedor/scroll por uno propio */
  renderMain?: (children: React.ReactNode) => React.ReactNode
  children: React.ReactNode
}) {
  const {
    nav,
    activeKey,
    className,
    topOffsetClassName = 'top-0',
    renderSidebarHeader,
    renderSidebarFooter,
    renderTopbar,
    renderMain,
    children,
  } = props

  const [mobileOpen, setMobileOpen] = useState(false)

  const flatItems = useMemo(() => nav.flatMap((g) => g.items), [nav])
  const active = useMemo(() => (activeKey ? flatItems.find((i) => i.key === activeKey) : null), [activeKey, flatItems])

  function closeMobile() {
    setMobileOpen(false)
  }

  function openMobile() {
    setMobileOpen(true)
  }

  function handleItem(item: PanelNavItem) {
    item.onSelect?.()
    closeMobile()
  }

  const Sidebar = ({ variant }: { variant: 'desktop' | 'mobile' }) => (
    <div className="flex flex-col h-full min-h-0 bg-sidebar text-sidebar-foreground">
      {renderSidebarHeader ? (
        <div className="sticky top-0 z-10">{renderSidebarHeader({ closeMobile })}</div>
      ) : (
        <div className="sticky top-0 z-10 flex items-center gap-2.5 px-4 py-3 border-b border-sidebar-border">
          <span className="text-xs font-semibold">Panel</span>
          {variant === 'mobile' ? (
            <button
              type="button"
              onClick={closeMobile}
              className="ml-auto h-8 w-8 inline-flex items-center justify-center rounded-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          ) : null}
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <nav className="px-2 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {nav.map((group, gi) => {
            if (!group.items.length) return null
            return (
              <div key={group.label ?? String(gi)}>
                {group.label ? (
                  <p
                    className={cn(
                      'px-3 pb-2 text-2xs font-medium uppercase tracking-wider text-sidebar-foreground/60',
                      gi === 0 ? 'pt-2' : 'pt-4'
                    )}
                  >
                    {group.label}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeKey != null && item.key === activeKey
                    const cls = cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors text-left',
                      isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/60'
                    )

                    if (item.href) {
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          onClick={() => closeMobile()}
                          className={cls}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-95" /> : null}
                          {item.label}
                          {item.badge ? (
                            <span className="ml-auto text-[11px] rounded-full px-2 py-0.5 tabular-nums bg-sidebar-accent/70 text-sidebar-accent-foreground">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      )
                    }

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleItem(item)}
                        className={cls}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-95" /> : null}
                        {item.label}
                        {item.badge ? (
                          <span className="ml-auto text-[11px] rounded-full px-2 py-0.5 tabular-nums bg-sidebar-accent/70 text-sidebar-accent-foreground">
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {renderSidebarFooter ? <div className="border-t border-sidebar-border">{renderSidebarFooter()}</div> : null}
    </div>
  )

  const DefaultTopbar = () => (
    <div className={cn('h-12 bg-background border-b border-border flex items-center px-4 sm:px-5 gap-3 shrink-0 sticky z-40', topOffsetClassName)}>
      <button
        type="button"
        onClick={openMobile}
        className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-4 w-4" />
      </button>
      <h1 className="text-sm font-semibold flex-1">{active?.label ?? 'Panel'}</h1>
    </div>
  )

  const Main = () => (
    <div className="flex-1 min-w-0 flex flex-col">
      {renderTopbar ? renderTopbar({ openMobile }) : <DefaultTopbar />}
      {renderMain ? renderMain(children) : <ScrollArea className="flex-1">{children}</ScrollArea>}
    </div>
  )

  return (
    <div className={cn('min-h-dvh flex', className)}>
      <aside className={cn('hidden lg:flex flex-col w-52 shrink-0 sticky self-start h-dvh', topOffsetClassName)}>
        <Sidebar variant="desktop" />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-52 p-0">
          <div className="pt-10 h-full">
            <Sidebar variant="mobile" />
          </div>
        </SheetContent>
      </Sheet>

      <Main />
    </div>
  )
}

