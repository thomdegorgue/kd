'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Package, Boxes, Edit2, AlertCircle } from 'lucide-react'
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
  SheetFooter,
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
import { useStock, useUpdateStock } from '@/lib/hooks/use-stock'
import { updateStockSchema, type UpdateStockInput } from '@/lib/validations/stock'
import type { StockItem } from '@/lib/actions/stock'

export default function StockPage() {
  const [search, setSearch] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [editing, setEditing] = useState<StockItem | null>(null)

  const { data: items = [], isLoading } = useStock({ low_stock_only: lowOnly })
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

  const lowStockCount = items.filter((i) => i.track_stock && i.quantity <= 5).length
  const outOfStockCount = items.filter((i) => i.track_stock && i.quantity === 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Boxes className="h-5 w-5 text-muted-foreground" />
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
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar productos..."
          searchValue={search}
          onSearchChange={setSearch}
          filterPreset="stock"
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {lowOnly ? 'No hay productos con bajo stock.' : 'No hay productos.'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Seguimiento</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
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
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`font-mono font-bold text-base ${
                              isOutOfStock ? 'text-destructive' : isLowStock ? 'text-amber-600' : ''
                            }`}
                          >
                            {item.quantity}
                          </span>
                          {isOutOfStock && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <AlertCircle className="h-3 w-3" />
                              Sin stock
                            </Badge>
                          )}
                          {isLowStock && (
                            <Badge variant="secondary" className="text-xs">
                              Bajo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.track_stock ? (
                          <Badge variant="secondary" className="text-xs">
                            Activo
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(item)}
                          aria-label={`Editar stock de ${item.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Sheet para editar */}
      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              Ajustar stock
            </SheetTitle>
          </SheetHeader>

          {editing && (
            <div className="py-4 space-y-6">
              {/* Producto actual */}
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

              {/* Form */}
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Nueva cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={0}
                    className="h-10"
                    placeholder="0"
                    {...form.register('quantity', { valueAsNumber: true })}
                  />
                  {form.formState.errors.quantity && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.quantity.message}
                    </p>
                  )}
                </div>

                <SheetFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(null)
                      form.reset()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </SheetFooter>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
