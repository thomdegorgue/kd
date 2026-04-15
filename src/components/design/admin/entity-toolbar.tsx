'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, MoreHorizontal, FileDown, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDateInput, getCalendarMonthRange } from '@/lib/design/date-range'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { NativeScroll } from '@/components/ui/native-scroll'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PRODUCT_CATEGORIES = [
  { id: 'ropa', label: 'Ropa' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'calzado', label: 'Calzado' },
] as const

export type EntityToolbarFilterPreset =
  | 'generic'
  | 'productos'
  | 'pedidos'
  | 'ventas'
  | 'cuenta'
  | 'stock'
  | 'envios'
  | 'finanzas'
  | 'banners'
  | 'tareas'

export type AppliedEntityFilters = {
  dateFrom: string
  dateTo: string
  categories?: string[]
  paymentMethod?: string
  shipmentStatus?: string
  movementType?: string
  bannersActiveOnly?: boolean
  /** Pedidos: todos | preparacion | en_camino | entregado */
  pedidosStatus?: string
  /** Tareas: qué lista mostrar */
  tareasStatus?: 'todas' | 'pendientes' | 'completadas'
}

function defaultDates() {
  const { start, end } = getCalendarMonthRange()
  return { dateFrom: formatDateInput(start), dateTo: formatDateInput(end) }
}

type EntityToolbarProps = {
  placeholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  filterPreset: EntityToolbarFilterPreset
  onApplyFilters?: (filters: AppliedEntityFilters) => void /** Valores aplicados (para reinicializar el sheet al abrir si hace falta) */
  appliedFilters?: Partial<AppliedEntityFilters>
}

export function EntityToolbar({
  placeholder = 'Buscar...',
  searchValue,
  onSearchChange,
  filterPreset,
  onApplyFilters,
  appliedFilters,
}: EntityToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const defaults = useMemo(() => defaultDates(), [])
  const [dateFrom, setDateFrom] = useState(appliedFilters?.dateFrom ?? defaults.dateFrom)
  const [dateTo, setDateTo] = useState(appliedFilters?.dateTo ?? defaults.dateTo)
  const [categories, setCategories] = useState<string[]>(
    appliedFilters?.categories ?? PRODUCT_CATEGORIES.map((c) => c.id)
  )
  const [paymentMethod, setPaymentMethod] = useState(appliedFilters?.paymentMethod ?? 'todos')
  const [shipmentStatus, setShipmentStatus] = useState(appliedFilters?.shipmentStatus ?? 'todos')
  const [movementType, setMovementType] = useState(appliedFilters?.movementType ?? 'todos')
  const [bannersActiveOnly, setBannersActiveOnly] = useState(
    appliedFilters?.bannersActiveOnly ?? false
  )
  const [pedidosStatus, setPedidosStatus] = useState(appliedFilters?.pedidosStatus ?? 'todos')
  const [tareasStatus, setTareasStatus] = useState<'todas' | 'pendientes' | 'completadas'>(
    appliedFilters?.tareasStatus ?? 'todas'
  )

  useEffect(() => {
    if (!filterOpen) return
    setDateFrom(appliedFilters?.dateFrom ?? defaults.dateFrom)
    setDateTo(appliedFilters?.dateTo ?? defaults.dateTo)
    if (appliedFilters?.categories) setCategories(appliedFilters.categories)
    if (appliedFilters?.paymentMethod) setPaymentMethod(appliedFilters.paymentMethod)
    if (appliedFilters?.shipmentStatus) setShipmentStatus(appliedFilters.shipmentStatus)
    if (appliedFilters?.movementType) setMovementType(appliedFilters.movementType)
    if (appliedFilters?.bannersActiveOnly !== undefined)
      setBannersActiveOnly(appliedFilters.bannersActiveOnly)
    if (appliedFilters?.pedidosStatus !== undefined) setPedidosStatus(appliedFilters.pedidosStatus)
    if (appliedFilters?.tareasStatus) setTareasStatus(appliedFilters.tareasStatus)
  }, [filterOpen, appliedFilters, defaults.dateFrom, defaults.dateTo])

  const showFilterButton = filterPreset !== 'generic'

  function buildPayload(): AppliedEntityFilters {
    const base: AppliedEntityFilters = { dateFrom, dateTo }
    if (filterPreset === 'productos' || filterPreset === 'stock') {
      base.categories = categories.length ? categories : PRODUCT_CATEGORIES.map((c) => c.id)
    }
    if (filterPreset === 'ventas') base.paymentMethod = paymentMethod
    if (filterPreset === 'envios') base.shipmentStatus = shipmentStatus
    if (filterPreset === 'finanzas') {
      base.movementType = movementType
    }
    if (filterPreset === 'banners') base.bannersActiveOnly = bannersActiveOnly
    if (filterPreset === 'pedidos') base.pedidosStatus = pedidosStatus
    if (filterPreset === 'tareas') base.tareasStatus = tareasStatus
    return base
  }

  function handleApply() {
    const payload = buildPayload()
    onApplyFilters?.(payload)
    setFilterOpen(false)
    toast.success('Filtros aplicados', { description: 'Vista actualizada (demo).' })
  }

  function handleClear() {
    const d = defaultDates()
    setDateFrom(d.dateFrom)
    setDateTo(d.dateTo)
    setCategories(PRODUCT_CATEGORIES.map((c) => c.id))
    setPaymentMethod('todos')
    setShipmentStatus('todos')
    setMovementType('todos')
    setBannersActiveOnly(false)
    setPedidosStatus('todos')
    setTareasStatus('todas')
    onApplyFilters?.({
      dateFrom: d.dateFrom,
      dateTo: d.dateTo,
      categories: PRODUCT_CATEGORIES.map((c) => c.id),
      paymentMethod: 'todos',
      shipmentStatus: 'todos',
      movementType: 'todos',
      bannersActiveOnly: false,
      pedidosStatus: 'todos',
      tareasStatus: 'todas',
    })
    toast.message('Filtros limpiados')
  }

  function toggleCategory(id: string) {
    setCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch w-full">
        <div className="relative flex-1 min-w-0 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={placeholder}
            className="pl-9 h-10 sm:h-9 text-sm w-full"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-end sm:justify-start gap-2 shrink-0">
          {showFilterButton && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 sm:h-9 sm:w-9 rounded-lg shrink-0"
              aria-label="Filtros"
              onClick={() => setFilterOpen(true)}
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'icon' }),
                'h-10 w-10 sm:h-9 sm:w-9 rounded-lg shrink-0 p-0 [&_svg]:size-3.5'
              )}
              aria-label="Más acciones"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onSelect={() => toast.message('Exportar PDF', { description: 'Disponible al conectar F2/F4.' })}
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onSelect={() => toast.message('Exportar CSV', { description: 'Disponible al conectar F2/F4.' })}
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onSelect={() => toast.message('Importar CSV', { description: 'Disponible al conectar F2/F4.' })}
              >
                <FileDown className="h-3.5 w-3.5" />
                Importar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-sm font-semibold">Filtros</SheetTitle>
          </SheetHeader>
          <NativeScroll className="flex-1 min-h-0">
            <div className="p-5 space-y-5">
              {(filterPreset === 'productos' ||
                filterPreset === 'pedidos' ||
                filterPreset === 'ventas' ||
                filterPreset === 'cuenta' ||
                filterPreset === 'stock' ||
                filterPreset === 'envios' ||
                filterPreset === 'finanzas' ||
                filterPreset === 'banners') && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Rango de fechas</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-2xs text-muted-foreground">Desde</Label>
                      <Input
                        type="date"
                        className="h-9 text-xs"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-2xs text-muted-foreground">Hasta</Label>
                      <Input
                        type="date"
                        className="h-9 text-xs"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    Por defecto: mes en curso ({defaults.dateFrom} — {defaults.dateTo}).
                  </p>
                </div>
              )}

              {(filterPreset === 'productos' || filterPreset === 'stock') && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Categorías</p>
                  <div className="space-y-2">
                    {PRODUCT_CATEGORIES.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${c.id}`}
                          checked={categories.includes(c.id)}
                          onCheckedChange={() => toggleCategory(c.id)}
                        />
                        <Label htmlFor={`cat-${c.id}`} className="text-xs font-normal cursor-pointer">
                          {c.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filterPreset === 'ventas' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Medio de pago</Label>
                  <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                    <SelectTrigger className="h-9 text-xs w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="mp">Mercado Pago</SelectItem>
                      <SelectItem value="debito">Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {filterPreset === 'envios' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Estado de envío</Label>
                  <Select value={shipmentStatus} onValueChange={(v) => v && setShipmentStatus(v)}>
                    <SelectTrigger className="h-9 text-xs w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="preparing">En preparación</SelectItem>
                      <SelectItem value="in_transit">En camino</SelectItem>
                      <SelectItem value="delivered">Entregado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {filterPreset === 'finanzas' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de movimiento</Label>
                  <Select value={movementType} onValueChange={(v) => v && setMovementType(v)}>
                    <SelectTrigger className="h-9 text-xs w-full min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="ingreso">Ingresos</SelectItem>
                      <SelectItem value="egreso">Egresos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {filterPreset === 'banners' && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">Solo banners activos</p>
                    <p className="text-2xs text-muted-foreground">Oculta los pausados en la lista</p>
                  </div>
                  <Switch checked={bannersActiveOnly} onCheckedChange={setBannersActiveOnly} />
                </div>
              )}

              {filterPreset === 'pedidos' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Estado del pedido</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'todos', label: 'Todos' },
                        { id: 'preparacion', label: 'En preparación' },
                        { id: 'en_camino', label: 'En camino' },
                        { id: 'entregado', label: 'Entregado' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setPedidosStatus(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                          pedidosStatus === f.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'text-muted-foreground border-border bg-background hover:bg-muted'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-2xs text-muted-foreground leading-snug">
                    Elegí estado y rango de fechas; Aplicar actualiza la lista (demo).
                  </p>
                </div>
              )}

              {filterPreset === 'tareas' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Mostrar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'todas' as const, label: 'Todas' },
                        { id: 'pendientes' as const, label: 'Solo pendientes' },
                        { id: 'completadas' as const, label: 'Solo completadas' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setTareasStatus(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                          tareasStatus === f.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'text-muted-foreground border-border bg-background hover:bg-muted'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-2xs text-muted-foreground leading-snug">
                    Combiná con la búsqueda para acotar título o descripción (demo).
                  </p>
                </div>
              )}

              {filterPreset === 'cuenta' && (
                <p className="text-2xs text-muted-foreground">
                  Filtrá movimientos de cuenta por período (demo).
                </p>
              )}
            </div>
          </NativeScroll>
          <div className="border-t border-border p-4 flex gap-2 shrink-0">
            <Button type="button" variant="outline" className="flex-1 text-sm" onClick={handleClear}>
              Limpiar
            </Button>
            <Button type="button" className="flex-1 text-sm" onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
