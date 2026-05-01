'use client'

import { useState } from 'react'
import { MessageCircle, CheckCircle2, Circle, XCircle, Search, Trash2, Plus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useOrder, useUpdateOrderStatus, useCancelOrder, useCreateOrder } from '@/lib/hooks/use-orders'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { OrderStatus } from '@/lib/types'
import { useProducts } from '@/lib/hooks/use-products'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUnsavedChanges } from '@/lib/hooks/use-unsaved-changes'

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivered']
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Recibido',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

function nextStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current)
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

type OrderSheetProps = {
  id: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderSheet({ id, open, onOpenChange }: OrderSheetProps) {
  const router = useRouter()
  const isCreate = !id
  const { data: order, isLoading } = useOrder(id ?? '')
  const updateStatus = useUpdateOrderStatus()
  const cancelMutation = useCancelOrder()
  const createMutation = useCreateOrder()
  const { formatPrice } = useCurrency()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const debouncedProductSearch = useDebounce(productSearch, 300)

  const { data: productsData } = useProducts({
    pageSize: 20,
    search: debouncedProductSearch || undefined,
    is_active: true,
  })
  const products = (productsData?.items ?? []) as unknown as {
    id: string
    name: string
    price: number
    is_active: boolean
  }[]

  const createFormSchema = z.object({
    customer_name: z.string().optional(),
    customer_phone: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
      product_id: z.string().uuid(),
      product_name: z.string(),
      quantity: z.number().int().min(1),
      unit_price: z.number().int().min(0),
    })).min(1, 'Agregá al menos un producto'),
  })
  type CreateFormValues = z.infer<typeof createFormSchema>
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { customer_name: '', customer_phone: '', notes: '', items: [] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const watchedItems = form.watch('items')
  useUnsavedChanges(!id && form.formState.isDirty)
  const totalCreate = watchedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  function addProduct(product: { id: string; name: string; price: number }) {
    const existing = watchedItems.findIndex((i) => i.product_id === product.id)
    if (existing >= 0) {
      form.setValue(`items.${existing}.quantity`, watchedItems[existing].quantity + 1, { shouldDirty: true })
    } else {
      append({ product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.price })
    }
    setProductSearch('')
  }

  const filteredProducts = products.slice(0, 10)

  const status = order?.status as OrderStatus | undefined
  const items = (order?.items ?? []) as Array<{
    product_name: string
    quantity: number
    unit_price: number
  }>
  const customer = order?.customer as { id: string; name: string; phone: string | null; address?: string } | null | undefined
  const total = order?.total as number | undefined
  const createdAt = order?.created_at as string | undefined
  const notes = order?.notes as string | null | undefined

  const waLink = customer?.phone
    ? `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(customer.name)}%2C%20te%20escribimos%20sobre%20tu%20pedido.`
    : null

  const next = status ? nextStatus(status) : null
  const isCancelled = status === 'cancelled'
  const isDelivered = status === 'delivered'

  // Create mode UI
  if (isCreate) {
    const onSubmitCreate = form.handleSubmit(async (data) => {
      const customer = data.customer_name
        ? { name: data.customer_name, phone: data.customer_phone || undefined }
        : undefined

      const created = await createMutation.mutateAsync({
        items: data.items.map((i) => ({ ...i, variant_id: undefined })),
        customer,
        notes: data.notes || undefined,
        total: totalCreate,
      })

      const createdId = (created as { id?: string } | null)?.id
      onOpenChange(false)
      if (createdId) {
        router.replace(`/admin/orders?edit=${createdId}`)
      } else {
        router.replace('/admin/orders')
      }
    })

    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle>Nuevo pedido</SheetTitle>
          </SheetHeader>

          <form onSubmit={onSubmitCreate} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Productos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar producto..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {productSearch && filteredProducts.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted text-left"
                          onClick={() => addProduct(p)}
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="text-muted-foreground tabular-nums">{formatPrice(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {fields.length > 0 && (
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate">{field.product_name}</span>
                          <Input
                            type="number"
                            min={1}
                            className="w-16 text-center"
                            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                          />
                          <span className="text-muted-foreground tabular-nums w-20 text-right">
                            {formatPrice(watchedItems[index]?.unit_price * (watchedItems[index]?.quantity ?? 1))}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive shrink-0"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t font-medium">
                        <span>Total</span>
                        <span className="tabular-nums">{formatPrice(totalCreate)}</span>
                      </div>
                    </div>
                  )}

                  {form.formState.errors.items && (
                    <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Cliente (opcional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="os-customer-name" className="text-xs">Nombre</Label>
                      <Input id="os-customer-name" {...form.register('customer_name')} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="os-customer-phone" className="text-xs">Teléfono</Label>
                      <Input id="os-customer-phone" {...form.register('customer_phone')} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="os-notes">Notas</Label>
                <Textarea id="os-notes" rows={2} {...form.register('notes')} />
              </div>
            </div>

            <div className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending || fields.length === 0}>
                <Plus className="h-4 w-4 mr-1" />
                {createMutation.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <SheetTitle>Pedido</SheetTitle>
            {order && <span className="text-xs font-mono text-muted-foreground">{(order.id as string).slice(0, 8)}...</span>}
          </div>
          {createdAt && (
            <p className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </SheetHeader>

        {isLoading || !id ? (
          <div className="flex-1 p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Timeline */}
            {!isCancelled && (
              <div className="px-6 py-4 border-b">
                <div className="flex items-center gap-1">
                  {STATUS_FLOW.map((s, idx) => {
                    const currentIdx = status ? STATUS_FLOW.indexOf(status) : -1
                    const isPast = idx <= currentIdx
                    const isCurrent = idx === currentIdx
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1">
                          {isPast ? (
                            <CheckCircle2 className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-primary/50'}`} />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground/30" />
                          )}
                          <span className={`text-[10px] text-center leading-tight ${isCurrent ? 'text-primary font-medium' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                            {STATUS_LABELS[s]}
                          </span>
                        </div>
                        {idx < STATUS_FLOW.length - 1 && (
                          <div className={`h-px flex-1 mx-1 mb-4 ${idx < currentIdx ? 'bg-primary/50' : 'bg-muted'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="px-6 py-3 border-b flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Pedido cancelado</span>
              </div>
            )}

            {/* Estado actual + botón avanzar */}
            {status && (
              <div className="px-6 py-3 border-b flex items-center justify-between gap-3">
                <OrderStatusBadge status={status} />
                <div className="flex gap-2">
                  {next && (
                    <Button
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: id!, status: next })}
                    >
                      Marcar: {STATUS_LABELS[next]}
                    </Button>
                  )}
                  {!isCancelled && !isDelivered && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={cancelMutation.isPending}
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        Cancelar
                      </Button>
                      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancelar pedido</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro? Esta acción no se puede deshacer. El pedido quedará como cancelado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Volver</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => {
                                setCancelDialogOpen(false)
                                cancelMutation.mutate({ id: id!, reason: 'Cancelado desde panel' })
                              }}
                            >
                              Sí, cancelar pedido
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productos</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums font-medium shrink-0">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-sm">Total</span>
                <span className="tabular-nums">{total !== undefined ? formatPrice(total) : '—'}</span>
              </div>
              {notes && (
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground">Nota: {notes}</p>
                </div>
              )}
            </div>

            {/* Cliente */}
            {customer && (
              <>
                <Separator />
                <div className="px-6 py-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-medium">{customer.name}</p>
                  {customer.phone && (
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  )}
                  {customer.address && (
                    <p className="text-sm text-muted-foreground">{customer.address}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer actions */}
        {!isLoading && id && (
          <div className="px-6 py-4 border-t shrink-0 flex gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp
              </a>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
