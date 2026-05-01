'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Package,
  Boxes,
  Edit2,
  AlertCircle,
  Upload,
  ChevronRight,
  Minus,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { EmptyState } from '@/components/shared/empty-state'
import { PackInactiveWarning } from '@/components/shared/pack-inactive-warning'
import { useStock, useUpdateStock } from '@/lib/hooks/use-stock'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { updateStockSchema, type UpdateStockInput } from '@/lib/validations/stock'
import type { StockItem } from '@/lib/actions/stock'
import type { ModuleName } from '@/lib/types'

type StockFilter = 'all' | 'low' | 'out' | 'tracked'

function StockBadge({ item }: { item: StockItem }) {
  if (!item.track_stock) return <span className="text-muted-foreground text-xs">—</span>
  if (item.quantity === 0) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs animate-pulse">
        <AlertCircle className="h-3 w-3" />
        Sin stock
      </Badge>
    )
  }
  if (item.quantity <= 5) {
    return <Badge variant="secondary" className="text-xs text-amber-600">Bajo</Badge>
  }
  return <Badge variant="secondary" className="text-xs">OK</Badge>
}

export default function StockPage() {
  const [search, setSearch] = useState('')
  const [stockStatus, setStockStatus] = useState<StockFilter>('all')
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)

  const { modules } = useAdminContext()
  const { data: items = [], isLoading } = useStock()
  const updateMutation = useUpdateStock()

  const form = useForm<UpdateStockInput>({
    resolver: zodResolver(updateStockSchema),
  })

  function openEdit(item: StockItem) {
    setEditing(item)
    form.reset({ product_id: item.id, quantity: item.quantity })
  }

  async function onSubmit(data: UpdateStockInput) {
    await updateMutation.mutateAsync(data)
    setEditing(null)
    form.reset()
  }

  async function quickAdjust(item: StockItem, delta: number) {
    const next = Math.max(0, item.quantity + delta)
    await updateMutation.mutateAsync({ product_id: item.id, quantity: next })
  }

  const filtered = items.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (stockStatus === 'low') return i.track_stock && i.quantity > 0 && i.quantity <= 5
    if (stockStatus === 'out') return i.track_stock && i.quantity === 0
    if (stockStatus === 'tracked') return i.track_stock
    return true
  })

  const lowStockCount = items.filter((i) => i.track_stock && i.quantity <= 5).length
  const outOfStockCount = items.filter((i) => i.track_stock && i.quantity === 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Boxes className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Stock</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {items.length} productos
                {lowStockCount > 0 && (
                  <span className="text-amber-600 font-medium ml-2">
                    {lowStockCount} bajo stock
                  </span>
                )}
                {outOfStockCount > 0 && (
                  <span className="text-destructive font-medium ml-2">
                    {outOfStockCount} sin stock
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => setCsvOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Importar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>

        <PackInactiveWarning
          requiredModule={'stock' as ModuleName}
          activeModules={modules as Record<ModuleName, boolean>}
        />
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar productos..."
          searchValue={search}
          onSearchChange={setSearch}
          filterPreset="stock"
          onApplyFilters={(f) => setStockStatus((f.stockStatus ?? 'all') as StockFilter)}
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="Sin productos"
            description={stockStatus !== 'all' ? 'No hay productos con ese filtro.' : 'Todavía no tenés productos con stock asignado.'}
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden space-y-2">
              {filtered.map((item) => {
                const isOutOfStock = item.track_stock && item.quantity === 0
                const isLowStock = item.track_stock && item.quantity > 0 && item.quantity <= 5
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3"
                  >
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-10 w-10 rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`font-mono font-bold text-sm ${
                          isOutOfStock ? 'text-destructive' : isLowStock ? 'text-amber-600' : ''
                        }`}>
                          {item.quantity}
                        </span>
                        <StockBadge item={item} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={item.quantity === 0 || updateMutation.isPending}
                        onClick={() => quickAdjust(item, -1)}
                        aria-label="Reducir 1"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={updateMutation.isPending}
                        onClick={() => quickAdjust(item, 1)}
                        aria-label="Aumentar 1"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(item)}
                        aria-label="Editar stock"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden sm:block border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Estado</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Seguimiento</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const isOutOfStock = item.track_stock && item.quantity === 0
                    const isLowStock = item.track_stock && item.quantity > 0 && item.quantity <= 5

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-mono font-bold text-base ${
                            isOutOfStock ? 'text-destructive' : isLowStock ? 'text-amber-600' : ''
                          }`}>
                            {item.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          <StockBadge item={item} />
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          {item.track_stock ? (
                            <Badge variant="secondary" className="text-xs">Activo</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="icon-sm"
                              disabled={item.quantity === 0 || updateMutation.isPending}
                              onClick={() => quickAdjust(item, -1)}
                              aria-label="Reducir 1"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon-sm"
                              disabled={updateMutation.isPending}
                              onClick={() => quickAdjust(item, 1)}
                              aria-label="Aumentar 1"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(item)}
                              aria-label={`Editar stock de ${item.name}`}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Sheet ajustar stock */}
      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              Ajustar stock
            </SheetTitle>
          </SheetHeader>

          {editing && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Producto</p>
                  <div className="flex items-center gap-3">
                    {editing.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editing.image_url}
                        alt={editing.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{editing.name}</p>
                      <p className="text-xs text-muted-foreground">Stock actual: {editing.quantity}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Nueva cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={0}
                    className="h-8"
                    placeholder="0"
                    {...form.register('quantity', { valueAsNumber: true })}
                  />
                  {form.formState.errors.quantity && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.quantity.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reason">Motivo del ajuste <span className="text-muted-foreground">(opcional)</span></Label>
                  <Input
                    id="reason"
                    className="h-8"
                    placeholder="Ej: recepción de mercadería, corrección..."
                    {...form.register('reason')}
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t shrink-0 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setEditing(null); form.reset() }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet importar CSV */}
      <Sheet open={csvOpen} onOpenChange={setCsvOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              Importar stock desde CSV
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              El CSV debe tener las columnas: <code className="text-xs bg-muted px-1 rounded">product_id</code> y <code className="text-xs bg-muted px-1 rounded">quantity</code>.
            </p>
            <p className="text-xs text-muted-foreground">
              Funcionalidad de importación disponible próximamente.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
