'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Info, CheckCircle2, AlertTriangle, Plus, Minus, Check, ShoppingBag, Package, Tag, Truck, DollarSign, Activity, Layers, Bot, Wallet, CheckSquare, Users, Globe, BarChart2, X, Bell, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

// ── Qty Stepper demos ─────────────────────────────────────────────────────────

function QuantityStepper() {
  const [qty, setQty] = useState(0)
  if (qty === 0) return (
    <button onClick={() => setQty(1)} className="w-full h-9 rounded-xl text-xs font-semibold text-white bg-primary hover:opacity-90 transition-opacity">
      Agregar al carrito
    </button>
  )
  return (
    <div className="flex items-stretch h-9 rounded-xl overflow-hidden border-2 border-primary">
      <button onClick={() => setQty(q => Math.max(0, q - 1))} className="w-9 flex items-center justify-center hover:bg-muted/40 transition-colors">
        <Minus className="h-3 w-3 text-primary" />
      </button>
      <span className="flex-1 flex items-center justify-center text-xs font-bold text-primary">{qty}</span>
      <button onClick={() => setQty(q => q + 1)} className="w-9 flex items-center justify-center bg-primary text-white hover:opacity-90 transition-opacity">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

function QuantityStepperActive() {
  const [qty, setQty] = useState(2)
  return (
    <div className="flex items-stretch h-9 rounded-xl overflow-hidden border-2 border-primary">
      <button onClick={() => setQty(q => Math.max(0, q - 1))} className="w-9 flex items-center justify-center hover:bg-muted/40 transition-colors">
        <Minus className="h-3 w-3 text-primary" />
      </button>
      <span className="flex-1 flex items-center justify-center text-xs font-bold text-primary">{qty}</span>
      <button onClick={() => setQty(q => q + 1)} className="w-9 flex items-center justify-center bg-primary text-white hover:opacity-90 transition-opacity">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

function QuantityStepperCompact() {
  const [qty, setQty] = useState(1)
  return (
    <div className="flex items-stretch h-7 rounded-lg overflow-hidden border border-primary w-fit">
      <button onClick={() => setQty(q => Math.max(0, q - 1))} className="w-7 flex items-center justify-center hover:bg-muted/40 transition-colors">
        <Minus className="h-2.5 w-2.5 text-primary" />
      </button>
      <span className="w-6 flex items-center justify-center text-xs font-bold text-primary">{qty}</span>
      <button onClick={() => setQty(q => q + 1)} className="w-7 flex items-center justify-center bg-primary text-white hover:opacity-90 transition-opacity">
        <Plus className="h-2.5 w-2.5" />
      </button>
    </div>
  )
}

// ── Module Card demo ──────────────────────────────────────────────────────────

const PLAN_BADGE_STYLE: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro:  'bg-violet-500/10 text-violet-600',
}

function ModuleCardExample({ active, label, desc, plan, Icon }: {
  active: boolean; label: string; desc: string; plan: string; Icon: React.ElementType
}) {
  return (
    <div
      className={`relative flex items-start gap-3 rounded-xl border p-4 transition-all ${
        active ? 'border-border bg-primary/[0.03]' : 'border-border opacity-55'
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

      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-primary' : 'bg-muted'}`}>
        <Icon className={`h-4 w-4 ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${!active ? 'text-muted-foreground' : ''}`}>{label}</span>
          <Badge className={`text-2xs px-1.5 py-0 ${PLAN_BADGE_STYLE[plan]}`}>{plan}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">{title}</p>
      {children}
      <Separator />
    </section>
  )
}

export function ComponentsTab() {
  return (
    <div className="space-y-10 max-w-3xl">

      <Section title="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">SM</Button>
          <Button size="default">Default</Button>
          <Button size="lg">LG</Button>
        </div>
      </Section>

      <Section title="Badges / Estados">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Error</Badge>
          <Badge className="bg-success text-white hover:bg-success/90">Activo</Badge>
          <Badge className="bg-warning text-white hover:bg-warning/90">Pendiente</Badge>
          <Badge className="bg-error text-white hover:bg-error/90">Bloqueado</Badge>
        </div>
      </Section>

      <Section title="Tipografía — Inter">
        <div className="space-y-2">
          <p className="text-5xl font-semibold tracking-tight">Display 5xl · Semibold</p>
          <p className="text-4xl font-semibold tracking-tight">Heading 4xl · Semibold</p>
          <p className="text-3xl font-semibold tracking-tight">Heading 3xl</p>
          <p className="text-2xl font-semibold tracking-tight">Heading 2xl</p>
          <p className="text-xl font-medium">Title XL · Medium</p>
          <p className="text-lg font-medium">Title LG · Medium</p>
          <p className="text-base">Body base — El dueño recibe el pedido por WhatsApp y lo confirma en el panel.</p>
          <p className="text-sm text-muted-foreground">Body SM muted — Información secundaria, descripciones, metadatos.</p>
          <p className="text-xs text-muted-foreground tracking-wider uppercase">Label XS uppercase — Categoría / Estado</p>
        </div>
      </Section>

      <Section title="Formularios">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div className="space-y-1.5">
            <Label>Nombre del producto</Label>
            <Input placeholder="Ej: Remera básica negra" />
          </div>
          <div className="space-y-1.5">
            <Label>Precio</Label>
            <Input type="number" placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea placeholder="Descripción opcional..." rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Seleccioná..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ropa">Ropa</SelectItem>
                <SelectItem value="accesorios">Accesorios</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-3 max-w-xs">
          <div className="flex items-center gap-2">
            <Checkbox id="stock" />
            <Label htmlFor="stock" className="cursor-pointer">Tiene stock limitado</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="visible" />
            <Label htmlFor="visible" className="cursor-pointer">Visible en vitrina</Label>
          </div>
          <RadioGroup defaultValue="efectivo" className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="efectivo" id="efectivo" />
              <Label htmlFor="efectivo">Efectivo</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="transferencia" id="transferencia" />
              <Label htmlFor="transferencia">Transferencia</Label>
            </div>
          </RadioGroup>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: 'Productos',      value: '24',  desc: '+3 esta semana'      },
            { title: 'Pedidos',        value: '142', desc: '8 pendientes hoy'    },
            { title: 'Caja de Ahorro', value: '4',   desc: '$17.300 pendiente'   },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-medium uppercase tracking-wide">{item.title}</CardDescription>
                <CardTitle className="text-3xl font-semibold tracking-tight">{item.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Alertas">
        <div className="space-y-3 max-w-xl">
          {/* Info */}
          <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Información</p>
              <p className="text-sm mt-0.5 opacity-80">Tu plan vence el 30 de abril. Renovalo para no perder acceso.</p>
            </div>
          </div>
          {/* Error */}
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Error</p>
              <p className="text-sm mt-0.5 opacity-80">No se pudo procesar el pago. Verificá los datos.</p>
            </div>
          </div>
          {/* Éxito */}
          <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Éxito</p>
              <p className="text-sm mt-0.5 opacity-80">Producto guardado correctamente.</p>
            </div>
          </div>
          {/* Advertencia */}
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Advertencia</p>
              <p className="text-sm mt-0.5 opacity-80">2 productos con stock crítico (≤ 5 unidades). Revisá el inventario.</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Progreso / Loading">
        <div className="space-y-3 max-w-sm">
          <Progress value={33} />
          <Progress value={66} />
          <Progress value={100} />
        </div>
        <div className="space-y-2 max-w-sm">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </Section>

      <Section title="Avatares + Tooltip">
        <div className="flex items-center gap-3">
          {['TM', 'JD', 'AB', 'SK'].map((initials) => (
            <Tooltip key={initials}>
              <TooltipTrigger>
                <Avatar>
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>Usuario {initials}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </Section>

      <Section title="Quantity Stepper">
        <div className="space-y-4 max-w-xs">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Estado inicial (qty = 0)</p>
            <QuantityStepper />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Con cantidad (qty = 2)</p>
            <QuantityStepperActive />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Compacto — carrito (h-7)</p>
            <QuantityStepperCompact />
          </div>
        </div>
      </Section>

      <Section title="Module Card — Activo vs Inactivo">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <ModuleCardExample active label="Banners" desc="Carrusel de imágenes en la vitrina" plan="free" Icon={Package} />
          <ModuleCardExample active={false} label="Mayorista" desc="Tienda mayorista separada" plan="pro" Icon={BarChart2} />
          <ModuleCardExample active label="Ventas" desc="Registro de ventas y cobros (POS)" plan="free" Icon={Tag} />
          <ModuleCardExample active={false} label="Asistente IA" desc="Chat con GPT-4o-mini" plan="pro" Icon={Truck} />
        </div>
      </Section>

      <Section title="Status Badges — Pedidos">
        <div className="flex flex-wrap gap-2">
          <Badge className="text-xs border bg-warning/10 text-warning border-warning/20" variant="outline">pendiente</Badge>
          <Badge className="text-xs border bg-sky-500/10 text-sky-600 border-sky-200" variant="outline">confirmado</Badge>
          <Badge className="text-xs border bg-violet-500/10 text-violet-600 border-violet-200" variant="outline">enviado</Badge>
          <Badge className="text-xs border bg-success/10 text-success border-success/20" variant="outline">entregado</Badge>
          <Badge className="text-xs border bg-muted text-muted-foreground border-border" variant="outline">cancelado</Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge className="text-xs border bg-success/10 text-success border-success/20" variant="outline">active</Badge>
          <Badge className="text-xs border bg-warning/10 text-warning border-warning/20" variant="outline">past_due</Badge>
          <Badge className="text-xs border bg-sky-500/10 text-sky-600 border-sky-200" variant="outline">demo</Badge>
          <Badge className="text-xs border bg-error/10 text-error border-error/20" variant="outline">suspended</Badge>
        </div>
      </Section>

      <Section title="Plan Badges">
        <div className="flex flex-wrap gap-2">
          <Badge className="text-xs bg-muted text-muted-foreground">free · incluido en $20.000/mes</Badge>
          <Badge className="text-xs bg-violet-500/10 text-violet-600">pro · +$5.000/mes</Badge>
        </div>
      </Section>

      <Section title="Empty States">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          {/* Sin pedidos */}
          <div className="rounded-xl border border-border py-10 flex flex-col items-center justify-center text-center px-6">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium">Sin pedidos todavía</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Cuando tus clientes hagan pedidos por WhatsApp, aparecerán aquí.</p>
          </div>
          {/* Sin productos — con CTA */}
          <div className="rounded-xl border border-dashed border-border py-10 flex flex-col items-center justify-center text-center px-6 gap-3">
            <Package className="h-10 w-10 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-medium">Sin productos en esta categoría</p>
              <p className="text-xs text-muted-foreground mt-1">Agregá productos para que tus clientes puedan comprar.</p>
            </div>
            <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              <Plus className="h-3.5 w-3.5" />Agregar producto
            </button>
          </div>
        </div>
      </Section>

      <Section title="Toasts — demo interactivo">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast.success('Producto guardado', { description: 'Los cambios se reflejan en la vitrina.' })}>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Success
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast.error('Error al guardar', { description: 'Verificá tu conexión e intentá de nuevo.' })}>
            <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Error
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast.info('Nuevo pedido recibido', { description: 'María González · #0143 · $18.500' })}>
            <Bell className="h-3.5 w-3.5 text-sky-500" /> Info
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast.warning('Stock crítico', { description: '2 productos con ≤ 5 unidades disponibles.' })}>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Warning
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast('Asistente IA procesando...', { icon: <Sparkles className="h-3.5 w-3.5 text-violet-500" /> })}>
            <Sparkles className="h-3.5 w-3.5 text-violet-500" /> Custom
          </Button>
        </div>
      </Section>

      <Section title="Toasts — referencia visual">
        <div className="relative max-w-sm space-y-2">
          <p className="text-xs text-muted-foreground mb-3">Referencia estática del diseño. Los toasts reales aparecen en la esquina inferior derecha.</p>
          {/* Success */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-800">Producto guardado</p>
              <p className="text-xs text-emerald-700/70 mt-0.5">Los cambios se reflejan en la vitrina.</p>
            </div>
            <button className="text-emerald-600/60 hover:text-emerald-800 transition-colors shrink-0"><X className="h-3.5 w-3.5" /></button>
          </div>
          {/* Error */}
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-800">Error al guardar</p>
              <p className="text-xs text-red-700/70 mt-0.5">Verificá tu conexión e intentá de nuevo.</p>
            </div>
            <button className="text-red-600/60 hover:text-red-800 transition-colors shrink-0"><X className="h-3.5 w-3.5" /></button>
          </div>
          {/* Info */}
          <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 shadow-sm">
            <Info className="h-4 w-4 text-sky-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sky-800">Nuevo pedido recibido</p>
              <p className="text-xs text-sky-700/70 mt-0.5">María González · #0143 · $18.500</p>
            </div>
            <button className="text-sky-600/60 hover:text-sky-800 transition-colors shrink-0"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </Section>

      <Section title="Paleta de colores (brand KitDigital)">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Primary · #1b1b1b',   cls: 'bg-primary text-primary-foreground' },
            { label: 'Secondary · #f6f6f6', cls: 'bg-secondary text-secondary-foreground border' },
            { label: 'Muted',               cls: 'bg-muted text-muted-foreground border' },
            { label: 'Success',             cls: 'bg-success text-white' },
            { label: 'Warning',             cls: 'bg-warning text-white' },
            { label: 'Error',               cls: 'bg-error text-white' },
            { label: 'Info',                cls: 'bg-info text-white' },
            { label: 'Pro',                 cls: 'bg-pro text-white' },
            { label: 'Destructive',         cls: 'bg-destructive text-white' },
          ].map((c) => (
            <div key={c.label} className={`${c.cls} rounded-lg px-4 py-3 text-xs font-medium min-w-[140px]`}>
              {c.label}
            </div>
          ))}
        </div>
      </Section>

    </div>
  )
}
