'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  LayoutDashboard, Store, CreditCard, Activity, Settings,
  Search, TrendingUp, Users, DollarSign,
  ChevronRight, Plus, Edit2, Shield, BarChart2,
  AlertTriangle, CheckCircle2, Clock, Menu,
} from 'lucide-react'
import Image from 'next/image'

type Section = 'dashboard' | 'tiendas' | 'billing' | 'eventos' | 'planes'

const STORES = [
  { name: 'La Boutique de Ana', slug: 'la-boutique', plan: 'pro',     status: 'active',    mrr: 4900, orders: 142, owner: 'Ana R.',   created: '15 feb 2025' },
  { name: 'TechStore BA',       slug: 'techstore',   plan: 'starter', status: 'active',    mrr: 1900, orders: 28,  owner: 'Mateo G.', created: '03 mar 2025' },
  { name: 'Deportes Sur',       slug: 'dep-sur',     plan: 'pro',     status: 'past_due',  mrr: 4900, orders: 67,  owner: 'Carlos M.',created: '22 ene 2025' },
  { name: 'Moda Express',       slug: 'moda-exp',    plan: 'starter', status: 'demo',      mrr: 1900, orders: 5,   owner: 'Sofía T.', created: '10 abr 2025' },
  { name: 'El Rincón Gourmet',  slug: 'rincongour',  plan: 'free',    status: 'active',    mrr: 0,    orders: 12,  owner: 'Luis P.',  created: '28 mar 2025' },
  { name: 'Artesanías Nadia',   slug: 'artesanias',  plan: 'pro',     status: 'suspended', mrr: 4900, orders: 89,  owner: 'Nadia F.', created: '05 dic 2024' },
]

const EVENTS = [
  { action: 'create_product',      store: 'la-boutique', actor: 'user',   time: 'hace 2min',  ok: true  },
  { action: 'update_order_status', store: 'techstore',   actor: 'user',   time: 'hace 5min',  ok: true  },
  { action: 'billing_webhook',     store: 'dep-sur',     actor: 'system', time: 'hace 18min', ok: false },
  { action: 'create_customer',     store: 'moda-exp',    actor: 'user',   time: 'hace 24min', ok: true  },
  { action: 'delete_product',      store: 'rincongour',  actor: 'user',   time: 'hace 1h',    ok: true  },
  { action: 'ai_assistant_query',  store: 'la-boutique', actor: 'ai',     time: 'hace 1h',    ok: true  },
  { action: 'update_store_config', store: 'artesanias',  actor: 'user',   time: 'hace 2h',    ok: true  },
]

const PLANS = [
  { name: 'Free',    price: 0,    maxProducts: 10,  maxOrders: 50,  modules: 3,  color: '#6e6e73' },
  { name: 'Starter', price: 1900, maxProducts: 100, maxOrders: 500, modules: 8,  color: '#4f46e5' },
  { name: 'Pro',     price: 4900, maxProducts: -1,  maxOrders: -1,  modules: 16, color: '#7c3aed' },
]

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-success/10 text-success border-success/20',
  past_due:  'bg-warning/10 text-warning border-warning/20',
  demo:      'bg-sky-500/10 text-sky-600 border-sky-200',
  suspended: 'bg-error/10 text-error border-error/20',
}

const PLAN_STYLE: Record<string, string> = {
  free:    'bg-muted text-muted-foreground border',
  starter: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  pro:     'bg-violet-500/10 text-violet-600 border-violet-200',
}

const ACTOR_STYLE: Record<string, string> = {
  user:      'bg-sky-500/10 text-sky-600',
  system:    'bg-muted text-muted-foreground',
  ai:        'bg-violet-500/10 text-violet-600',
  superadmin:'bg-primary/10 text-primary',
}

function fmt(n: number) { return n === 0 ? '—' : `$${n.toLocaleString('es-AR')}` }

export function SuperadminPreview() {
  const [section,       setSection]      = useState<Section>('dashboard')
  const [storeDetail,   setStoreDetail]  = useState<typeof STORES[0] | null>(null)
  const [sidebarOpen,   setSidebarOpen]  = useState(false)
  const [statusFilter,  setStatusFilter] = useState('todos')

  const NAV = [
    { section: 'dashboard' as Section, icon: LayoutDashboard, label: 'Dashboard' },
    { section: 'tiendas'   as Section, icon: Store,           label: 'Tiendas'   },
    { section: 'billing'   as Section, icon: CreditCard,      label: 'Billing'   },
    { section: 'eventos'   as Section, icon: Activity,        label: 'Eventos'   },
    { section: 'planes'    as Section, icon: Settings,        label: 'Planes'    },
  ]

  // ── Sidebar ──────────────────────────────────────────────────────────────
  function Sidebar() {
    return (
      <div className="flex flex-col h-full bg-[#1b1b1b]">
        <div className="px-4 py-4 flex items-center gap-2.5 border-b border-white/10">
          <Image src="/logo.jpg" alt="KitDigital" width={24} height={24} className="rounded opacity-90" />
          <div>
            <p className="text-xs font-semibold text-white/90">KitDigital.ar</p>
            <p className="text-2xs text-white/35">Superadmin</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ section: s, icon: Icon, label }) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left"
              style={section === s
                ? { background: 'rgba(255,255,255,0.14)', color: '#fff' }
                : { color: 'rgba(255,255,255,0.5)' }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
              {s === 'tiendas' && <span className="ml-auto text-2xs bg-white/15 rounded-full px-1.5">{STORES.length}</span>}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-white/15 flex items-center justify-center">
              <Shield className="h-3 w-3 text-white/70" />
            </div>
            <p className="text-2xs text-white/35">superadmin@kitdigital.ar</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  function renderDashboard() {
    const totalMRR = STORES.filter(s => s.status === 'active').reduce((sum, s) => sum + s.mrr, 0)
    return (
      <div className="p-5 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'MRR',              value: fmt(totalMRR),                                  sub: '+8% vs mes ant.',           icon: DollarSign  },
            { label: 'Tiendas activas',  value: String(STORES.filter(s=>s.status==='active').length), sub: '1 nueva esta semana',  icon: Store       },
            { label: 'Usuarios totales', value: '156',                                          sub: '12 nuevos este mes',        icon: Users       },
            { label: 'Churn rate',       value: '2.1%',                                         sub: 'Bajo · meta < 3%',          icon: TrendingUp  },
          ].map((m) => (
            <Card key={m.label} className="border-border hover:shadow-xs transition-shadow">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-2xs uppercase tracking-wide font-medium text-muted-foreground">{m.label}</p>
                  <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">{m.value}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xs text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alertas */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requiere atención</p>
          {[
            { icon: AlertTriangle, color: 'text-warning', label: 'Deportes Sur — pago vencido hace 3 días', action: 'Ver' },
            { icon: AlertTriangle, color: 'text-error',   label: 'Artesanías Nadia — cuenta suspendida',    action: 'Revisar' },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
              <a.icon className={`h-4 w-4 shrink-0 ${a.color}`} />
              <span className="flex-1 text-xs">{a.label}</span>
              <button className="text-xs font-medium" style={{ color: '#1b1b1b' }} onClick={() => setSection('tiendas')}>{a.action} →</button>
            </div>
          ))}
        </div>

        {/* Plan distribution */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Distribución de planes</p>
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map((p) => {
              const count = STORES.filter(s => s.plan === p.name.toLowerCase()).length
              return (
                <div key={p.name} className="rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: p.color }}>{p.name}</span>
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.price === 0 ? 'Gratis' : fmt(p.price) + '/mes'}
                  </p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(count/STORES.length)*100}%`, background: p.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Tiendas ──────────────────────────────────────────────────────────────
  function renderTiendas() {
    const visibleStores = statusFilter === 'todos'
      ? STORES
      : STORES.filter(s => s.status === statusFilter)

    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar tienda o slug..." className="pl-9 h-9 text-sm" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="h-9 w-36 text-xs shrink-0">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="past_due">Vencidas</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
              <SelectItem value="suspended">Suspendidas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop — tabla */}
        <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tienda</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Dueño</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Estado</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">MRR</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Pedidos</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visibleStores.map((s) => (
                <tr key={s.slug} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setStoreDetail(s)}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-2xs text-muted-foreground font-mono">{s.slug}.kitdigital.ar</p>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-muted-foreground">{s.owner}</td>
                  <td className="px-3 py-3">
                    <Badge className={`text-2xs border ${PLAN_STYLE[s.plan]}`} variant="outline">{s.plan}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={`text-2xs border ${STATUS_STYLE[s.status]}`} variant="outline">{s.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold hidden lg:table-cell">{fmt(s.mrr)}</td>
                  <td className="px-3 py-3 text-right hidden lg:table-cell text-muted-foreground">{s.orders}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile — cards */}
        <div className="sm:hidden space-y-2">
          {visibleStores.map((s) => (
            <button
              key={s.slug}
              onClick={() => setStoreDetail(s)}
              className="w-full flex items-start gap-3 rounded-xl border border-border p-4 text-left hover:border-foreground/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{s.name}</p>
                <p className="text-2xs text-muted-foreground font-mono truncate">{s.slug}.kitdigital.ar</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className={`text-2xs border ${PLAN_STYLE[s.plan]}`} variant="outline">{s.plan}</Badge>
                  <Badge className={`text-2xs border ${STATUS_STYLE[s.status]}`} variant="outline">{s.status}</Badge>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Billing ──────────────────────────────────────────────────────────────
  function renderBilling() {
    return (
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Cobros este mes', value: '$52.300',  icon: CheckCircle2, color: 'text-success' },
            { label: 'Pendientes',      value: '$9.800',   icon: Clock,        color: 'text-warning' },
            { label: 'Fallidos',        value: '$4.900',   icon: AlertTriangle,color: 'text-error'   },
          ].map((s) => (
            <Card key={s.label} className="border-border/60">
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                  <p className="text-2xs text-muted-foreground uppercase tracking-wide font-medium">{s.label}</p>
                </div>
                <p className="text-xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40">
            <span className="text-xs font-medium">Últimos eventos de billing</span>
          </div>
          {[
            { store: 'la-boutique',  event: 'payment.success',  amount: 4900, time: 'hace 2h',  ok: true  },
            { store: 'techstore',    event: 'payment.success',  amount: 1900, time: 'hace 5h',  ok: true  },
            { store: 'dep-sur',      event: 'payment.failed',   amount: 4900, time: 'hace 3d',  ok: false },
            { store: 'artesanias',   event: 'subscription.suspended', amount: 4900, time: 'hace 5d', ok: false },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 last:border-0 text-xs">
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${e.ok ? 'bg-success' : 'bg-error'}`} />
              <span className="font-mono text-muted-foreground shrink-0">{e.store}</span>
              <span className="flex-1 font-medium">{e.event}</span>
              <span className="text-muted-foreground">{e.time}</span>
              <span className="font-semibold">{fmt(e.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Eventos ──────────────────────────────────────────────────────────────
  function renderEventos() {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Filtrar por acción o tienda..." className="pl-9 h-9 text-sm" />
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs">Tipo</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40 grid grid-cols-[auto_1fr_80px_80px_24px] gap-3 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            <span>OK</span><span>Acción</span><span>Tienda</span><span className="text-right">Actor</span><span />
          </div>
          {EVENTS.map((e, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_80px_80px_24px] gap-3 items-center px-4 py-2.5 border-b border-border/40 last:border-0 text-xs hover:bg-muted/30 transition-colors">
              <div className={`h-1.5 w-1.5 rounded-full ${e.ok ? 'bg-success' : 'bg-error'}`} />
              <span className="font-mono font-medium">{e.action}</span>
              <span className="text-muted-foreground text-2xs truncate">{e.store}</span>
              <div className="flex justify-end">
                <Badge className={`text-2xs ${ACTOR_STYLE[e.actor]}`}>{e.actor}</Badge>
              </div>
              <span className="text-2xs text-muted-foreground">{e.time.replace('hace ', '')}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Planes ───────────────────────────────────────────────────────────────
  function renderPlanes() {
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Los cambios de precio aplican en el próximo ciclo de facturación</p>
          <Button size="sm" className="h-8 gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />Nuevo plan</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div key={p.name} className="rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: p.color }}>{p.name}</p>
                  <p className="text-2xl font-bold mt-0.5">{p.price === 0 ? 'Gratis' : `$${p.price.toLocaleString('es-AR')}`}</p>
                  {p.price > 0 && <p className="text-xs text-muted-foreground">por mes</p>}
                </div>
                <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
              <Separator />
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex justify-between">
                  <span>Productos</span>
                  <span className="font-medium text-foreground">{p.maxProducts === -1 ? 'Ilimitados' : p.maxProducts}</span>
                </li>
                <li className="flex justify-between">
                  <span>Pedidos/mes</span>
                  <span className="font-medium text-foreground">{p.maxOrders === -1 ? 'Ilimitados' : p.maxOrders}</span>
                </li>
                <li className="flex justify-between">
                  <span>Módulos</span>
                  <span className="font-medium text-foreground">{p.modules}</span>
                </li>
              </ul>
              <div className="flex items-center gap-2 text-xs">
                <div className="h-4 w-4 rounded-full text-white flex items-center justify-center text-2xs font-bold shrink-0" style={{ background: p.color }}>
                  {STORES.filter(s => s.plan === p.name.toLowerCase()).length}
                </div>
                <span className="text-muted-foreground">tiendas activas</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const SECTION_RENDER: Record<Section, () => React.ReactNode> = {
    dashboard: renderDashboard, tiendas: renderTiendas, billing: renderBilling,
    eventos: renderEventos, planes: renderPlanes,
  }

  const label = NAV.find(n => n.section === section)?.label ?? section

  return (
    <div className="min-h-[calc(100dvh-40px)] bg-[#f4f4f4] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 sticky top-10 h-[calc(100dvh-40px)] self-start">
        <Sidebar />
      </aside>

      {/* Sidebar mobile — Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-52 p-0" style={{ background: '#1b1b1b' }}>
          <div className="pt-10 h-full">
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-12 bg-white border-b border-border flex items-center px-4 sm:px-5 gap-3 shrink-0 sticky top-10 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold flex-1">{label}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="h-3 w-3" />Superadmin
            </Badge>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {SECTION_RENDER[section]?.()}
        </ScrollArea>
      </div>

      {/* Store detail sheet */}
      <Sheet open={!!storeDetail} onOpenChange={(o) => !o && setStoreDetail(null)}>
        <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0">
          {storeDetail && (
            <>
              <SheetHeader className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-sm font-semibold">{storeDetail.name}</SheetTitle>
                  <div className="flex gap-2">
                    <Badge className={`text-xs border ${PLAN_STYLE[storeDetail.plan]}`} variant="outline">{storeDetail.plan}</Badge>
                    <Badge className={`text-xs border ${STATUS_STYLE[storeDetail.status]}`} variant="outline">{storeDetail.status}</Badge>
                  </div>
                </div>
              </SheetHeader>
              <ScrollArea className="flex-1">
                <div className="p-5 space-y-5">
                  {/* Info */}
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'Slug',    value: `${storeDetail.slug}.kitdigital.ar`       },
                      { label: 'Dueño',   value: storeDetail.owner                         },
                      { label: 'Creada',  value: storeDetail.created                       },
                      { label: 'MRR',     value: fmt(storeDetail.mrr)                      },
                      { label: 'Pedidos', value: String(storeDetail.orders)                },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center gap-3">
                        <span className="text-muted-foreground w-20 shrink-0">{r.label}</span>
                        <span className="font-medium font-mono">{r.value}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Estado */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Cambiar estado</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['active', 'past_due', 'suspended', 'demo'].map((s) => (
                        <button key={s} className={`px-3 py-2 rounded-lg text-xs font-medium border capitalize transition-opacity hover:opacity-100 ${STATUS_STYLE[s]} ${storeDetail.status === s ? 'opacity-100 ring-1 ring-offset-1 ring-current' : 'opacity-60'}`}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Plan override */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Plan</p>
                    <div className="flex gap-2">
                      {PLANS.map((p) => (
                        <button key={p.name} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-opacity ${PLAN_STYLE[p.name.toLowerCase()]} ${storeDetail.plan === p.name.toLowerCase() ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Danger zone */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-error">Zona peligrosa</p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full text-xs h-8 border-error/30 text-error hover:bg-error/5">Suspender tienda</Button>
                      <Button variant="outline" className="w-full text-xs h-8 border-error/30 text-error hover:bg-error/5">Eliminar tienda</Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
