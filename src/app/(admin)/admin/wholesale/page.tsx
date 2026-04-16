'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, X, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { z } from 'zod'
import { useWholesalePrices, useSetWholesalePrice, useDeleteWholesalePrice } from '@/lib/hooks/use-wholesale'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { WholesaleItem } from '@/lib/actions/wholesale'

const wholesaleFormSchema = z.object({
  product_id: z.string().uuid(),
  price_pesos: z.number().min(0.01, 'El precio debe ser mayor a 0'),
  min_quantity: z.number().int().min(1).optional(),
})
type WholesaleFormInput = z.infer<typeof wholesaleFormSchema>

export default function WholesalePage() {
  const [editing, setEditing] = useState<WholesaleItem | null>(null)
  const { data: items = [], isLoading } = useWholesalePrices()
  const setMutation = useSetWholesalePrice()
  const deleteMutation = useDeleteWholesalePrice()
  const { formatPrice } = useCurrency()

  const form = useForm<WholesaleFormInput>({
    resolver: zodResolver(wholesaleFormSchema),
  })

  function openEdit(item: WholesaleItem) {
    setEditing(item)
    form.reset({
      product_id: item.id,
      price_pesos: item.wholesale_price ? item.wholesale_price / 100 : undefined,
      min_quantity: item.min_quantity ?? undefined,
    })
  }

  async function onSubmit(data: WholesaleFormInput) {
    await setMutation.mutateAsync({
      product_id: data.product_id,
      price: Math.round(data.price_pesos * 100),
      min_quantity: data.min_quantity,
    })
    setEditing(null)
  }

  const withPrices = (items as WholesaleItem[]).filter((i) => i.wholesale_price !== null)

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Precios mayoristas</h2>
        <p className="text-sm text-muted-foreground">
          {withPrices.length} de {items.length} productos con precio mayorista
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay productos activos.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Precio público</TableHead>
                <TableHead className="text-right">Precio mayorista</TableHead>
                <TableHead className="text-center">Cant. mínima</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items as WholesaleItem[]).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt={item.name} className="h-7 w-7 rounded object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
                          <Package className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-sm">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatPrice(item.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {item.wholesale_price ? formatPrice(item.wholesale_price) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {item.min_quantity ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {item.wholesale_price && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
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
            <DialogTitle>Precio mayorista — {editing?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="price_pesos">Precio mayorista ($)</Label>
              <Input
                id="price_pesos"
                type="number"
                step="0.01"
                min={0.01}
                {...form.register('price_pesos', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="min_quantity">Cantidad mínima (opcional)</Label>
              <Input
                id="min_quantity"
                type="number"
                min={1}
                placeholder="Ej: 10"
                {...form.register('min_quantity', { valueAsNumber: true })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={setMutation.isPending}>
                {setMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
