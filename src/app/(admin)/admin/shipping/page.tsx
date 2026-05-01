'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Pencil, Trash2, Copy, CheckCircle2, Circle, XCircle, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
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

const STATUS_FLOW: ShipmentStatus[] = ['preparing', 'in_transit', 'delivered']

function ShipmentTimeline({
  status,
  onAdvance,
  disabled,
}: {
  status: ShipmentStatus
  onAdvance?: (next: ShipmentStatus) => void
  disabled?: boolean
}) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <XCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Cancelado</span>
      </div>
    )
  }

  const currentIdx = STATUS_FLOW.indexOf(status)
  return (
    <div className="flex items-center gap-1">
      {STATUS_FLOW.map((s, idx) => {
        const isPast = idx <= currentIdx
        const isCurrent = idx === currentIdx
        const canClick = onAdvance && idx === currentIdx + 1
        return (
          <div key={s} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => {
                if (!canClick) return
                onAdvance?.(s)
              }}
              disabled={!canClick || disabled}
              className={`flex flex-col items-center gap-1 min-w-0 ${canClick ? 'cursor-pointer' : 'cursor-default'}`}
              aria-label={`Marcar como ${SHIPMENT_STATUS_LABELS[s] ?? s}`}
            >
              {isPast ? (
                <CheckCircle2 className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-primary/50'}`} />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/30" />
              )}
              <span
                className={`text-[10px] text-center leading-tight ${
                  isCurrent ? 'text-primary font-medium' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/40'
                }`}
              >
                {SHIPMENT_STATUS_LABELS[s] ?? s}
              </span>
            </button>
            {idx < STATUS_FLOW.length - 1 && (
              <div
                className={`h-px flex-1 mx-1 mb-4 ${idx < currentIdx ? 'bg-primary/50' : 'bg-muted'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
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

  const shipTotal = shipmentsData?.total ?? 0
  const shipPages = Math.ceil(shipTotal / 50)

  const filteredShipments = useMemo(() => {
    const shipments = shipmentsData?.items ?? []
    if (!search.trim()) return shipments
    const q = search.toLowerCase()
    return (shipments as Record<string, unknown>[]).filter((s) => {
      const code = String(s.tracking_code ?? '').toLowerCase()
      const order = String(s.order_id ?? '').toLowerCase()
      return code.includes(q) || order.includes(q)
    })
  }, [shipmentsData?.items, search])

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
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold leading-none">Envíos</h2>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar envíos..."
          searchValue={search}
          onSearchChange={setSearch}
          filterPreset="envios"
        />
      </div>

      <div className="px-4 sm:px-6 space-y-6">
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
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : (methods as Record<string, unknown>[]).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay métodos de envío configurados.
              </div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="sm:hidden space-y-2">
                  {(methods as Record<string, unknown>[]).map((m) => (
                    <div
                      key={m.id as string}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/30"
                      onClick={() => openEdit(m)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name as string}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(m.price as number) === 0 ? 'Gratis' : formatPrice(m.price as number)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={m.is_active as boolean}
                          onCheckedChange={(checked) =>
                            updateMethodMutation.mutate({ id: m.id as string, is_active: checked })
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: tabla */}
                <div className="hidden sm:block border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Activo</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(methods as Record<string, unknown>[]).map((m) => (
                      <TableRow key={m.id as string} className="hover:bg-muted/50">
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
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(m)} aria-label={`Editar ${m.name as string}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={deleteMethodMutation.isPending}
                              onClick={() => deleteMethodMutation.mutate(m.id as string)}
                              aria-label={`Eliminar ${m.name as string}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'shipments' && (
          <div className="space-y-4">
            {shipmentsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay envíos registrados.
              </div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="grid gap-3 sm:hidden">
                  {(filteredShipments as Record<string, unknown>[]).map((s) => {
                    const status = s.status as ShipmentStatus
                    const transitions = SHIPMENT_TRANSITIONS[status] ?? []
                    const next = transitions.find((t) => t !== 'cancelled') as ShipmentStatus | undefined
                    return (
                      <div key={s.id as string} className="rounded-xl border bg-card p-4 space-y-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <Truck className="h-3.5 w-3.5" />
                            Envío
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold truncate">{s.tracking_code as string}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                navigator.clipboard.writeText(s.tracking_code as string)
                                toast.success('Código copiado')
                              }}
                              aria-label="Copiar código"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground font-mono">
                            Pedido {(s.order_id as string).slice(0, 8)}...
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[status] ?? 'outline'}>
                          {SHIPMENT_STATUS_LABELS[status] ?? status}
                        </Badge>
                      </div>

                      <ShipmentTimeline
                        status={status}
                        disabled={updateStatusMutation.isPending}
                        onAdvance={(nextStatus) =>
                          updateStatusMutation.mutate({ id: s.id as string, status: nextStatus })
                        }
                      />

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {new Date(s.created_at as string).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <div className="flex gap-2">
                          {next && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={updateStatusMutation.isPending}
                              onClick={() => updateStatusMutation.mutate({ id: s.id as string, status: next })}
                            >
                              Marcar: {SHIPMENT_STATUS_LABELS[next] ?? next}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

                {/* Desktop/tablet: table */}
                <div className="hidden sm:block border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Código</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead className="min-w-[260px]">Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(filteredShipments as Record<string, unknown>[]).map((s) => {
                        const status = s.status as ShipmentStatus
                        const transitions = SHIPMENT_TRANSITIONS[status] ?? []
                        const next = transitions.find((t) => t !== 'cancelled') as ShipmentStatus | undefined
                        return (
                          <TableRow key={s.id as string} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs font-medium">{s.tracking_code as string}</span>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(s.tracking_code as string)
                                    toast.success('Código copiado')
                                  }}
                                  aria-label="Copiar código"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {(s.order_id as string).slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <ShipmentTimeline
                                status={status}
                                disabled={updateStatusMutation.isPending}
                                onAdvance={(nextStatus) =>
                                  updateStatusMutation.mutate({ id: s.id as string, status: nextStatus })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(s.created_at as string).toLocaleDateString('es-AR', {
                                day: '2-digit', month: '2-digit',
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {next && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    disabled={updateStatusMutation.isPending}
                                    onClick={() =>
                                      updateStatusMutation.mutate({ id: s.id as string, status: next })
                                    }
                                  >
                                    {SHIPMENT_STATUS_LABELS[next] ?? next}
                                  </Button>
                                )}
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
      </div>

      {/* Sheet para método de envío */}
      <Sheet
        open={showNewMethod || !!editingMethod}
        onOpenChange={(open) => {
          if (!open) { setShowNewMethod(false); setEditingMethod(null) }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-muted-foreground" />
              {editingMethod ? 'Editar método' : 'Nuevo método de envío'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmitMethod)} className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...form.register('name')} placeholder="Ej: Envío a domicilio" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
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
            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => { setShowNewMethod(false); setEditingMethod(null) }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMethodMutation.isPending || updateMethodMutation.isPending}>
                {createMethodMutation.isPending || updateMethodMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
