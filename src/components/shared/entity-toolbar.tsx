'use client'

import { useMemo, useState } from 'react'
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
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/lib/validations/expense'

export type EntityToolbarFilterPreset =
  | 'generic'
  | 'productos'
  | 'pedidos'
  | 'ventas'
  | 'cuenta'
  | 'stock'
  | 'envios'
  | 'finanzas'
  | 'gastos'
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
  pedidosStatus?: string
  tareasStatus?: 'todas' | 'pendientes' | 'completadas'
  stockStatus?: string
  expenseCategory?: string
}

const STOCK_STATUS_OPTIONS = [
  { id: 'all', label: 'Todos' },
  { id: 'low', label: 'Bajo stock' },
  { id: 'out', label: 'Sin stock' },
  { id: 'tracked', label: 'Con seguimiento' },
] as const

function getPeriodDates(preset: string): { from: string; to: string } | null {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const now = new Date()
  const today = fmt(now)
  switch (preset) {
    case 'today': return { from: today, to: today }
    case '7d': { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: fmt(d), to: today } }
    case '30d': { const d = new Date(now); d.setDate(d.getDate() - 30); return { from: fmt(d), to: today } }
    case 'month': return {
      from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
      to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    }
    case 'year': return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
    default: return null
  }
}

const PERIOD_PRESETS = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'year', label: 'Este año' },
]

function defaultDates() {
  const { start, end } = getCalendarMonthRange()
  return { dateFrom: formatDateInput(start), dateTo: formatDateInput(end) }
}

type EntityToolbarProps = {
  placeholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  filterPreset: EntityToolbarFilterPreset
  onApplyFilters?: (filters: AppliedEntityFilters) => void
  appliedFilters?: Partial<AppliedEntityFilters>
  /** Categorías dinámicas (para presets productos/stock) */
  categories?: { id: string; label: string }[]
}

export function EntityToolbar({
  placeholder = 'Buscar...',
  searchValue,
  onSearchChange,
  filterPreset,
  onApplyFilters,
  appliedFilters,
  categories: categoriesProp,
}: EntityToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const defaults = useMemo(() => defaultDates(), [])

  const allCategoryIds = useMemo(
    () => (categoriesProp ?? []).map((c) => c.id),
    [categoriesProp]
  )

  const [dateFrom, setDateFrom] = useState(appliedFilters?.dateFrom ?? defaults.dateFrom)
  const [dateTo, setDateTo] = useState(appliedFilters?.dateTo ?? defaults.dateTo)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    appliedFilters?.categories ?? allCategoryIds
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
  const [stockStatus, setStockStatus] = useState(appliedFilters?.stockStatus ?? 'all')
  const [expenseCategory, setExpenseCategory] = useState(appliedFilters?.expenseCategory ?? '')

  function syncFromApplied() {
    setDateFrom(appliedFilters?.dateFrom ?? defaults.dateFrom)
    setDateTo(appliedFilters?.dateTo ?? defaults.dateTo)
    if (appliedFilters?.categories) setSelectedCategories(appliedFilters.categories)
    if (appliedFilters?.paymentMethod) setPaymentMethod(appliedFilters.paymentMethod)
    if (appliedFilters?.shipmentStatus) setShipmentStatus(appliedFilters.shipmentStatus)
    if (appliedFilters?.movementType) setMovementType(appliedFilters.movementType)
    if (appliedFilters?.bannersActiveOnly !== undefined) setBannersActiveOnly(appliedFilters.bannersActiveOnly)
    if (appliedFilters?.pedidosStatus !== undefined) setPedidosStatus(appliedFilters.pedidosStatus)
    if (appliedFilters?.tareasStatus) setTareasStatus(appliedFilters.tareasStatus)
    if (appliedFilters?.stockStatus !== undefined) setStockStatus(appliedFilters.stockStatus)
    if (appliedFilters?.expenseCategory !== undefined) setExpenseCategory(appliedFilters.expenseCategory)
  }

  const showFilterButton = filterPreset !== 'generic'

  function buildPayload(): AppliedEntityFilters {
    const base: AppliedEntityFilters = { dateFrom, dateTo }
    if (filterPreset === 'productos' || filterPreset === 'stock') {
      base.categories = selectedCategories.length ? selectedCategories : allCategoryIds
    }
    if (filterPreset === 'ventas') base.paymentMethod = paymentMethod
    if (filterPreset === 'envios') base.shipmentStatus = shipmentStatus
    if (filterPreset === 'finanzas') base.movementType = movementType
    if (filterPreset === 'banners') base.bannersActiveOnly = bannersActiveOnly
    if (filterPreset === 'pedidos') base.pedidosStatus = pedidosStatus
    if (filterPreset === 'tareas') base.tareasStatus = tareasStatus
    if (filterPreset === 'stock') base.stockStatus = stockStatus
    if (filterPreset === 'gastos') { base.expenseCategory = expenseCategory }
    return base
  }

  function handleApply() {
    onApplyFilters?.(buildPayload())
    setFilterOpen(false)
  }

  function handleClear() {
    const d = defaultDates()
    setDateFrom(d.dateFrom)
    setDateTo(d.dateTo)
    setSelectedCategories(allCategoryIds)
    setPaymentMethod('todos')
    setShipmentStatus('todos')
    setMovementType('todos')
    setBannersActiveOnly(false)
    setPedidosStatus('todos')
    setTareasStatus('todas')
    setStockStatus('all')
    setExpenseCategory('')
    onApplyFilters?.({
      dateFrom: d.dateFrom,
      dateTo: d.dateTo,
      categories: allCategoryIds,
      paymentMethod: 'todos',
      shipmentStatus: 'todos',
      movementType: 'todos',
      bannersActiveOnly: false,
      pedidosStatus: 'todos',
      tareasStatus: 'todas',
      stockStatus: 'all',
      expenseCategory: '',
    })
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
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
              onClick={() => {
                syncFromApplied()
                setFilterOpen(true)
              }}
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
                onSelect={() => toast.message('Exportar PDF', { description: 'Próximamente disponible.' })}
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onSelect={() => toast.message('Exportar CSV', { description: 'Próximamente disponible.' })}
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onSelect={() => toast.message('Importar CSV', { description: 'Próximamente disponible.' })}
              >
                <FileDown className="h-3.5 w-3.5" />
                Importar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Sheet
        open={filterOpen}
        onOpenChange={(open) => {
          if (open) syncFromApplied()
          setFilterOpen(open)
        }}
      >
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
                filterPreset === 'gastos' ||
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

              {(filterPreset === 'productos' || filterPreset === 'stock') &&
                categoriesProp &&
                categoriesProp.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Categorías</p>
                  <div className="space-y-2">
                    {categoriesProp.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${c.id}`}
                          checked={selectedCategories.includes(c.id)}
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

              {(filterPreset === 'finanzas' || filterPreset === 'gastos') && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Período rápido</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PERIOD_PRESETS.map((p) => {
                      const dates = getPeriodDates(p.id)
                      const isActive = dates ? dateFrom === dates.from && dateTo === dates.to : false
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (dates) { setDateFrom(dates.from); setDateTo(dates.to) }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'text-muted-foreground border-border bg-background hover:bg-muted'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
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

              {filterPreset === 'stock' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Estado de stock</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STOCK_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStockStatus(opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                          stockStatus === opt.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'text-muted-foreground border-border bg-background hover:bg-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filterPreset === 'gastos' && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Categoría</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExpenseCategory('')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                        expenseCategory === ''
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'text-muted-foreground border-border bg-background hover:bg-muted'
                      }`}
                    >
                      Todas
                    </button>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setExpenseCategory(c === expenseCategory ? '' : c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                          expenseCategory === c
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'text-muted-foreground border-border bg-background hover:bg-muted'
                        }`}
                      >
                        {EXPENSE_CATEGORY_LABELS[c]}
                      </button>
                    ))}
                  </div>
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
                        { id: 'pending', label: 'Pendiente' },
                        { id: 'confirmed', label: 'Confirmado' },
                        { id: 'preparing', label: 'Preparando' },
                        { id: 'delivered', label: 'Entregado' },
                        { id: 'cancelled', label: 'Cancelado' },
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
                </div>
              )}

              {filterPreset === 'cuenta' && (
                <p className="text-2xs text-muted-foreground">
                  Filtrá movimientos de cuenta por período.
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
