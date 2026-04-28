'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, X, Package, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Boxes className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold leading-none">Precios mayoristas</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {withPrices.length} de {items.length} productos
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
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
                <TableRow className="hover:bg-transparent">
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Precio público</TableHead>
                  <TableHead className="text-right">Precio mayorista</TableHead>
                  <TableHead className="text-center">Cant. mínima</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items as WholesaleItem[]).map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
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
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)} aria-label={`Editar precio mayorista de ${item.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {item.wholesale_price && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(item.id)}
                            aria-label={`Eliminar precio mayorista de ${item.name}`}
                          >
                            <X className="h-4 w-4 text-destructive" />
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
      </div>

      {/* Sheet para editar precio */}
      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-muted-foreground" />
              Precio mayorista
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
                    <p className="text-xs text-muted-foreground">Precio público: {formatPrice(editing.price)}</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price_pesos">Precio mayorista ($)</Label>
                  <Input
                    id="price_pesos"
                    type="number"
                    step="0.01"
                    min={0.01}
                    {...form.register('price_pesos', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_quantity">Cantidad mínima (opcional)</Label>
                  <Input
                    id="min_quantity"
                    type="number"
                    min={1}
                    placeholder="Ej: 10"
                    {...form.register('min_quantity', { valueAsNumber: true })}
                  />
                </div>

                <SheetFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={setMutation.isPending}>
                    {setMutation.isPending ? 'Guardando...' : 'Guardar'}
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
