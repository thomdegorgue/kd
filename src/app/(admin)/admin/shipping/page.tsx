'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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
import {
  useShippingMethods,
  useCreateShippingMethod,
  useUpdateShippingMethod,
  useDeleteShippingMethod,
  useShipments,
  useUpdateShipmentStatus,
} from '@/lib/hooks/use-shipping'
import { z } from 'zod'
import { SHIPMENT_STATUS_LABELS } from '@/lib/validations/shipping'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { ShipmentStatus } from '@/lib/types'

const methodFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  price_pesos: z.number().min(0, 'El precio debe ser >= 0'),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
})
type MethodForm = z.infer<typeof methodFormSchema>

const SHIPMENT_TRANSITIONS: Record<string, string[]> = {
  preparing: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  preparing: 'secondary',
  in_transit: 'default',
  delivered: 'outline',
  cancelled: 'outline',
}

export default function ShippingPage() {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'methods' | 'shipments'>('methods')
  const [editingMethod, setEditingMethod] = useState<Record<string, unknown> | null>(null)
  const [showNewMethod, setShowNewMethod] = useState(false)
  const [shipPage, setShipPage] = useState(1)

  const { data: methods = [], isLoading: methodsLoading } = useShippingMethods()
  const { data: shipmentsData, isLoading: shipmentsLoading } = useShipments({ page: shipPage })
  const createMethodMutation = useCreateShippingMethod()
  const updateMethodMutation = useUpdateShippingMethod()
  const deleteMethodMutation = useDeleteShippingMethod()
  const updateStatusMutation = useUpdateShipmentStatus()
  const { formatPrice } = useCurrency()

  const shipments = shipmentsData?.items ?? []
  const shipTotal = shipmentsData?.total ?? 0
  const shipPages = Math.ceil(shipTotal / 50)

  const form = useForm<MethodForm>({
    resolver: zodResolver(methodFormSchema),
    defaultValues: { name: '', price_pesos: 0, is_active: true },
  })

  function openNew() {
    form.reset({ name: '', price_pesos: 0, is_active: true })
    setShowNewMethod(true)
  }

  function openEdit(method: Record<string, unknown>) {
    setEditingMethod(method)
    form.reset({
      name: method.name as string,
      price_pesos: (method.price as number) / 100,
      description: (method.description as string | undefined) ?? '',
      is_active: method.is_active as boolean,
    })
  }

  async function onSubmitMethod(data: MethodForm) {
    const payload = {
      name: data.name,
      price: Math.round(data.price_pesos * 100),
      description: data.description,
      is_active: data.is_active,
    }
    if (editingMethod) {
      await updateMethodMutation.mutateAsync({ id: editingMethod.id as string, ...payload })
      setEditingMethod(null)
    } else {
      await createMethodMutation.mutateAsync(payload)
      setShowNewMethod(false)
    }
    form.reset()
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Envíos</h2>

      <EntityToolbar
        placeholder="Buscar envíos..."
        searchValue={search}
        onSearchChange={setSearch}
        filterPreset="envios"
      />

      {/* Tabs */}
      <div className="flex gap-1">
        {(['methods', 'shipments'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(t)}
          >
            {t === 'methods' ? 'Métodos de envío' : 'Envíos'}
          </Button>
        ))}
      </div>

      {tab === 'methods' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo método
            </Button>
          </div>

          {methodsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (methods as Record<string, unknown>[]).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hay métodos de envío configurados.
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Activo</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(methods as Record<string, unknown>[]).map((m) => (
                    <TableRow key={m.id as string}>
                      <TableCell className="font-medium text-sm">{m.name as string}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(m.price as number) === 0 ? 'Gratis' : formatPrice(m.price as number)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={m.is_active as boolean}
                          onCheckedChange={(checked) =>
                            updateMethodMutation.mutate({ id: m.id as string, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={deleteMethodMutation.isPending}
                            onClick={() => deleteMethodMutation.mutate(m.id as string)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {tab === 'shipments' && (
        <div className="space-y-4">
          {shipmentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : shipments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hay envíos registrados.
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(shipments as Record<string, unknown>[]).map((s) => {
                      const status = s.status as ShipmentStatus
                      const transitions = SHIPMENT_TRANSITIONS[status] ?? []
                      return (
                        <TableRow key={s.id as string}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs font-medium">{s.tracking_code as string}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  navigator.clipboard.writeText(s.tracking_code as string)
                                  toast.success('Código copiado')
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {(s.order_id as string).slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[status] ?? 'outline'}>
                              {SHIPMENT_STATUS_LABELS[status] ?? status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(s.created_at as string).toLocaleDateString('es-AR', {
                              day: '2-digit', month: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {transitions.filter((t) => t !== 'cancelled').map((t) => (
                                <Button
                                  key={t}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  disabled={updateStatusMutation.isPending}
                                  onClick={() => updateStatusMutation.mutate({
                                    id: s.id as string,
                                    status: t as ShipmentStatus,
                                  })}
                                >
                                  {SHIPMENT_STATUS_LABELS[t] ?? t}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {shipPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={shipPage <= 1} onClick={() => setShipPage((p) => p - 1)}>Anterior</Button>
                  <span className="text-sm text-muted-foreground">{shipPage} / {shipPages}</span>
                  <Button variant="outline" size="sm" disabled={shipPage >= shipPages} onClick={() => setShipPage((p) => p + 1)}>Siguiente</Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Method form dialog */}
      <Dialog
        open={showNewMethod || !!editingMethod}
        onOpenChange={(open) => {
          if (!open) { setShowNewMethod(false); setEditingMethod(null) }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMethod ? 'Editar método' : 'Nuevo método de envío'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmitMethod)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...form.register('name')} placeholder="Ej: Envío a domicilio" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="price_pesos">Precio ($) — 0 para gratis</Label>
              <Input
                id="price_pesos"
                type="number"
                step="0.01"
                min={0}
                {...form.register('price_pesos', { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.watch('is_active') ?? true}
                onCheckedChange={(v) => form.setValue('is_active', v)}
              />
              <Label htmlFor="is_active">Activo</Label>
            </div>
            <Separator />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowNewMethod(false); setEditingMethod(null) }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMethodMutation.isPending || updateMethodMutation.isPending}>
                {createMethodMutation.isPending || updateMethodMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
