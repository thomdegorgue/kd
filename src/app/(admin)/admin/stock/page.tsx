'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  }

  const lowStockCount = items.filter((i) => i.track_stock && i.quantity <= 5).length

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Stock</h2>
          <p className="text-sm text-muted-foreground">
            {items.length} productos
            {lowStockCount > 0 && (
              <span className="text-destructive ml-1">· {lowStockCount} bajo stock</span>
            )}
          </p>
        </div>
        <Button
          variant={lowOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLowOnly((v) => !v)}
        >
          Solo bajo stock
        </Button>
      </div>

      <EntityToolbar
        placeholder="Buscar productos..."
        searchValue={search}
        onSearchChange={setSearch}
        filterPreset="stock"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {lowOnly ? 'No hay productos con bajo stock.' : 'No hay productos.'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Seguimiento</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
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
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-mono font-medium ${item.track_stock && item.quantity <= 5 ? 'text-destructive' : ''}`}>
                      {item.quantity}
                    </span>
                    {item.track_stock && item.quantity === 0 && (
                      <Badge variant="destructive" className="ml-2 text-xs">Sin stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.track_stock ? (
                      <Badge variant="secondary">Activo</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      Ajustar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar stock — {editing?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="quantity">Cantidad en stock</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              {form.formState.errors.quantity && (
                <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
