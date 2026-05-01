'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Users, Phone, Mail, ChevronRight, Calendar,
  Wallet, Plus, ArrowDown, ArrowUp, ShoppingBag,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import { useCustomers, useCustomer, useUpdateCustomer } from '@/lib/hooks/use-customers'
import { useSavingsMovements, useCreateSavingsAccount, useCreateSavingsMovement } from '@/lib/hooks/use-savings'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { OrderStatus } from '@/lib/types'
import Link from 'next/link'

type CustomerShape = {
  id: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  savings_accounts?: { id: string; name: string }[] | null
}

type OrderShape = {
  id: string
  status: OrderStatus
  total: number
  created_at: string
}

type SavingsAccountShape = {
  id: string
  name: string
}

type CustomerDetailShape = CustomerShape & {
  orders: OrderShape[]
  savings_account: SavingsAccountShape | null
}

type MovementShape = {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  description: string | null
  created_at: string
}

function CustomerAvatar({ name }: { name: string }) {
  return (
    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-primary">{name.charAt(0).toUpperCase()}</span>
    </div>
  )
}

function CustomerDetailSheet({
  customerId,
  onClose,
}: {
  customerId: string
  onClose: () => void
}) {
  const { data: customer, isLoading } = useCustomer(customerId)
  const { formatPrice } = useCurrency()
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal' | null>(null)
  const [notes, setNotes] = useState<string>('')
  const [editingNotes, setEditingNotes] = useState(false)
  const updateMutation = useUpdateCustomer()
  const createAccountMutation = useCreateSavingsAccount()
  const createMovementMutation = useCreateSavingsMovement()

  const c = customer as unknown as CustomerDetailShape | undefined

  const savingsAccountId = c?.savings_account?.id ?? null
  const { data: rawMovements = [] } = useSavingsMovements(savingsAccountId ?? undefined)
  const movements = rawMovements as unknown as MovementShape[]

  const accountBalance = movements.reduce(
    (sum, m) => sum + (m.type === 'deposit' ? m.amount : -m.amount),
    0,
  )

  const movementForm = useForm<{ amount_pesos: number; description?: string }>({
    defaultValues: { description: '' },
  })

  async function saveNotes() {
    if (!c) return
    await updateMutation.mutateAsync({ id: c.id, notes: notes || null })
    setEditingNotes(false)
  }

  function startEditNotes() {
    setNotes(c?.notes ?? '')
    setEditingNotes(true)
  }

  async function onSubmitMovement(data: { amount_pesos: number; description?: string }) {
    if (!savingsAccountId || !movementType) return
    await createMovementMutation.mutateAsync({
      account_id: savingsAccountId,
      type: movementType,
      amount: Math.round(data.amount_pesos * 100),
      description: data.description,
    })
    movementForm.reset()
    setMovementType(null)
  }

  async function createAccountForCustomer() {
    if (!c) return
    await createAccountMutation.mutateAsync({
      name: c.name,
      customer_id: c.id,
    })
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-3">
            {c && <CustomerAvatar name={c.name} />}
            <div className="flex-1 min-w-0">
              <span className="block truncate">{c?.name ?? 'Cargando...'}</span>
            </div>
            {c && (
              <Link
                href={`/admin/orders?new=1`}
                className="text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 shrink-0"
              >
                <ShoppingBag className="h-3.5 w-3.5 inline mr-1" />
                Nuevo pedido
              </Link>
            )}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : c ? (
          <Tabs defaultValue="datos" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-5 mt-4 w-auto justify-start shrink-0">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="pedidos">
                Pedidos
                {c.orders.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                    {c.orders.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
            </TabsList>

            {/* Tab Datos */}
            <TabsContent value="datos" className="flex-1 overflow-y-auto px-5 pb-5 mt-4 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="text-sm font-medium">{c.phone ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{c.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente desde</p>
                    <p className="text-sm font-medium">
                      {new Date(c.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  {!editingNotes && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={startEditNotes}
                    >
                      {c.notes ? 'Editar' : 'Agregar'}
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      rows={3}
                      placeholder="Notas internas sobre este cliente..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => setEditingNotes(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={saveNotes}
                        disabled={updateMutation.isPending}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {c.notes ?? <span className="italic">Sin notas</span>}
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Tab Pedidos */}
            <TabsContent value="pedidos" className="flex-1 overflow-y-auto px-5 pb-5 mt-4">
              {c.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Sin pedidos registrados.
                </p>
              ) : (
                <div className="divide-y divide-border/60 rounded-lg border overflow-hidden">
                  {c.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground">
                          #{order.id.slice(0, 8)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <OrderStatusBadge status={order.status} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('es-AR', {
                              day: '2-digit', month: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums shrink-0">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab Cuenta */}
            <TabsContent value="cuenta" className="flex-1 overflow-y-auto px-5 pb-5 mt-4">
              {savingsAccountId ? (
                <div className="space-y-4">
                  {/* Saldo */}
                  <div className="rounded-lg border p-4 text-center space-y-1">
                    <p className="text-xs text-muted-foreground">Saldo actual</p>
                    <p className={`text-3xl font-bold tabular-nums ${
                      accountBalance < 0 ? 'text-destructive' : accountBalance > 0 ? 'text-emerald-600' : ''
                    }`}>
                      {formatPrice(accountBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground">{c.savings_account?.name}</p>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setMovementType('deposit')}
                    >
                      <ArrowDown className="h-3.5 w-3.5 mr-1" />
                      Registrar pago
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setMovementType('withdrawal')}
                    >
                      <ArrowUp className="h-3.5 w-3.5 mr-1" />
                      Registrar cargo
                    </Button>
                  </div>

                  {/* Movimientos */}
                  {movements.length > 0 ? (
                    <div className="divide-y divide-border/60 rounded-lg border overflow-hidden">
                      {movements.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {m.type === 'deposit' ? (
                              <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                <ArrowDown className="h-3 w-3 text-emerald-600" />
                              </div>
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <ArrowUp className="h-3 w-3 text-destructive" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {m.description ?? (m.type === 'deposit' ? 'Abono' : 'Cargo')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(m.created_at).toLocaleDateString('es-AR', {
                                  day: '2-digit', month: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                            m.type === 'deposit' ? 'text-emerald-600' : 'text-destructive'
                          }`}>
                            {m.type === 'deposit' ? '+' : '-'}{formatPrice(m.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos registrados.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <Wallet className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Sin cuenta corriente</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Creá una cuenta para llevar registro de fiado y pagos.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={createAccountForCustomer}
                    disabled={createAccountMutation.isPending}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {createAccountMutation.isPending ? 'Creando...' : 'Crear cuenta corriente'}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>

      {/* Sheet movimiento desde detalle de cliente */}
      <Sheet open={!!movementType} onOpenChange={(open) => !open && setMovementType(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              {movementType === 'deposit' ? (
                <><ArrowDown className="h-5 w-5 text-muted-foreground" />Registrar pago / abono</>
              ) : (
                <><ArrowUp className="h-5 w-5 text-muted-foreground" />Registrar cargo / fiado</>
              )}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={movementForm.handleSubmit(onSubmitMovement)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mv-amount">Monto ($)</Label>
                <Input
                  id="mv-amount"
                  type="number"
                  step="0.01"
                  min={0.01}
                  className="h-8"
                  {...movementForm.register('amount_pesos', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mv-desc">Descripción (opcional)</Label>
                <Input
                  id="mv-desc"
                  className="h-8"
                  placeholder={movementType === 'deposit' ? 'Ej: Pago semanal...' : 'Ej: Productos fiados...'}
                  {...movementForm.register('description')}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setMovementType(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createMovementMutation.isPending}>
                {createMovementMutation.isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </Sheet>
  )
}

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading } = useCustomers({
    page,
    pageSize: 50,
    search: debouncedSearch || undefined,
  })

  const customers = (data?.items ?? []) as unknown as CustomerShape[]
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  function openCustomer(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('id', id)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  function closeCustomer() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('id')
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold leading-none">Clientes</h2>
            <p className="text-xs text-muted-foreground mt-1">{total} clientes</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar por nombre o teléfono..."
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          filterPreset="generic"
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Sin clientes"
            description={search ? 'No se encontraron clientes con ese criterio.' : 'Todavía no tenés clientes registrados.'}
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
              {customers.map((c) => {
                const hasCreditAccount = Array.isArray(c.savings_accounts) && c.savings_accounts.length > 0
                return (
                  <button
                    key={c.id}
                    className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/30 transition-colors"
                    onClick={() => openCustomer(c.id)}
                  >
                    <CustomerAvatar name={c.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        {hasCreditAccount && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Cuenta</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.phone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                        )}
                        {!c.phone && c.email && (
                          <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                )
              })}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden sm:block border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => {
                    const linkedAccount = Array.isArray(c.savings_accounts) && c.savings_accounts.length > 0
                      ? c.savings_accounts[0]
                      : null
                    return (
                      <TableRow
                        key={c.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => openCustomer(c.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CustomerAvatar name={c.name} />
                            <span className="font-medium text-sm">{c.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.phone ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.email ?? '—'}
                        </TableCell>
                        <TableCell>
                          {linkedAccount ? (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Wallet className="h-3 w-3" />
                              {linkedAccount.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('es-AR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedId && (
        <CustomerDetailSheet customerId={selectedId} onClose={closeCustomer} />
      )}
    </div>
  )
}
