'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ArrowDown, ArrowUp, Wallet, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  useSavingsAccounts,
  useSavingsMovements,
  useCreateSavingsAccount,
  useCreateSavingsMovement,
} from '@/lib/hooks/use-savings'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useCurrency } from '@/lib/hooks/use-currency'
import { EmptyState } from '@/components/shared/empty-state'
import { PackInactiveWarning } from '@/components/shared/pack-inactive-warning'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import type { ModuleName } from '@/lib/types'

type AccountShape = {
  id: string
  name: string
  balance: number
  customer_id: string | null
  customer_name: string | null
}

type MovementShape = {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  description: string | null
  created_at: string
}

function AccountAvatar({ name }: { name: string }) {
  return (
    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-primary">{name.charAt(0).toUpperCase()}</span>
    </div>
  )
}

const newAccountSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
})
type NewAccountInput = z.infer<typeof newAccountSchema>

export default function SavingsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal' | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null)

  const { data: accounts = [], isLoading } = useSavingsAccounts()
  const { data: movements = [] } = useSavingsMovements(selectedAccountId || undefined)
  const createAccountMutation = useCreateSavingsAccount()
  const createMovementMutation = useCreateSavingsMovement()
  const { formatPrice } = useCurrency()
  const { modules } = useAdminContext()

  const debouncedCustomerSearch = useDebounce(customerSearch, 300)
  const { data: customerResults } = useCustomers({
    search: debouncedCustomerSearch || undefined,
    pageSize: 5,
  })

  const accountsTyped = accounts as unknown as AccountShape[]
  const movementsTyped = movements as unknown as MovementShape[]
  const totalBalance = accountsTyped.reduce((sum, a) => sum + a.balance, 0)

  const selectedAccount = accountsTyped.find((a) => a.id === selectedAccountId)

  const accountForm = useForm<NewAccountInput>({
    resolver: zodResolver(newAccountSchema),
    defaultValues: { name: '' },
  })

  const movementForm = useForm<{ amount_pesos: number; description?: string }>({
    defaultValues: { description: '' },
  })

  async function onSubmitAccount(data: NewAccountInput) {
    await createAccountMutation.mutateAsync({
      name: data.name,
      ...(selectedCustomer ? { customer_id: selectedCustomer.id } : {}),
    })
    accountForm.reset()
    setSelectedCustomer(null)
    setCustomerSearch('')
    setShowNewAccount(false)
  }

  async function onSubmitMovement(data: { amount_pesos: number; description?: string }) {
    if (!selectedAccountId || !movementType) return
    await createMovementMutation.mutateAsync({
      account_id: selectedAccountId,
      type: movementType,
      amount: Math.round(data.amount_pesos * 100),
      description: data.description,
    })
    movementForm.reset()
    setMovementType(null)
  }

  function openNewAccount() {
    accountForm.reset()
    setSelectedCustomer(null)
    setCustomerSearch('')
    setShowNewAccount(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Cuentas de clientes</h2>
              <p className="text-xs text-muted-foreground mt-1">{accountsTyped.length} cuentas</p>
            </div>
          </div>
          <Button size="sm" onClick={openNewAccount}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva cuenta
          </Button>
        </div>

        <PackInactiveWarning
          requiredModule={'savings_account' as ModuleName}
          activeModules={modules as Record<ModuleName, boolean>}
        />

        {accountsTyped.length > 1 && (
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Total en todas las cuentas</p>
              </div>
              <p className="text-xl font-bold tabular-nums">{formatPrice(totalBalance)}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="px-4 sm:px-6 space-y-6">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : accountsTyped.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-12 w-12" />}
            title="Sin cuentas de clientes"
            description="Creá cuentas para tus clientes habituales. Llevá el registro de pagos, fiado y saldo pendiente."
            action={
              <Button size="sm" onClick={openNewAccount}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva cuenta
              </Button>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {accountsTyped.map((account) => {
              const isSelected = selectedAccountId === account.id
              const displayName = account.customer_name ?? account.name

              return (
                <Card
                  key={account.id}
                  className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                  onClick={() => setSelectedAccountId(isSelected ? null : account.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      {account.customer_name && (
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {account.customer_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      {displayName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className={`text-2xl font-bold tabular-nums ${account.balance < 0 ? 'text-destructive' : account.balance > 0 ? 'text-emerald-600' : ''}`}>
                      {formatPrice(account.balance)}
                    </p>
                    {isSelected && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); setMovementType('deposit') }}
                        >
                          <ArrowDown className="h-3.5 w-3.5 mr-1" />
                          Registrar pago
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); setMovementType('withdrawal') }}
                        >
                          <ArrowUp className="h-3.5 w-3.5 mr-1" />
                          Registrar cargo
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Movements for selected account */}
        {selectedAccount && movementsTyped.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Movimientos — {selectedAccount.customer_name ?? selectedAccount.name}
            </h3>
            <div className="divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
              {movementsTyped.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    {m.type === 'deposit' ? (
                      <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <ArrowUp className="h-3.5 w-3.5 text-destructive" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {m.description ?? (m.type === 'deposit' ? 'Abono recibido' : 'Cargo / fiado')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`tabular-nums text-sm font-semibold ${m.type === 'deposit' ? 'text-emerald-600' : 'text-destructive'}`}>
                    {m.type === 'deposit' ? '+' : '-'}{formatPrice(m.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheet nueva cuenta */}
      <Sheet open={showNewAccount} onOpenChange={setShowNewAccount}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-muted-foreground" />
              Nueva cuenta de cliente
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={accountForm.handleSubmit(onSubmitAccount)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Campo: Cliente */}
              <div className="space-y-1.5">
                <Label>Cliente (opcional)</Label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <AccountAvatar name={selectedCustomer.name} />
                      <span className="text-sm font-medium">{selectedCustomer.name}</span>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Input
                      className="h-8"
                      placeholder="Buscar cliente..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    {debouncedCustomerSearch.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        {(customerResults?.items as { id: string; name: string; phone: string | null }[] ?? []).slice(0, 5).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 text-left border-b last:border-0"
                            onClick={() => {
                              setSelectedCustomer(c)
                              setCustomerSearch('')
                              if (!accountForm.getValues('name')) {
                                accountForm.setValue('name', c.name)
                              }
                            }}
                          >
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-semibold text-primary">
                                {c.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{c.name}</span>
                            {c.phone && <span className="text-muted-foreground text-xs ml-1">{c.phone}</span>}
                          </button>
                        ))}
                        {customerResults?.items.length === 0 && (
                          <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Campo: Nombre de la cuenta */}
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Nombre de la cuenta</Label>
                <Input
                  id="acc-name"
                  className="h-8"
                  placeholder="Ej: María García, Empresa XYZ..."
                  {...accountForm.register('name')}
                />
                {accountForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{accountForm.formState.errors.name.message}</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowNewAccount(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createAccountMutation.isPending}>
                {createAccountMutation.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet movimiento */}
      <Sheet open={!!movementType} onOpenChange={(open) => !open && setMovementType(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              {movementType === 'deposit' ? (
                <>
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                  Registrar pago / abono
                </>
              ) : (
                <>
                  <ArrowUp className="h-5 w-5 text-muted-foreground" />
                  Registrar cargo / fiado
                </>
              )}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={movementForm.handleSubmit(onSubmitMovement)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount_pesos">Monto ($)</Label>
                <Input
                  id="amount_pesos"
                  type="number"
                  step="0.01"
                  min={0.01}
                  className="h-8"
                  {...movementForm.register('amount_pesos', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mov_desc">Descripción (opcional)</Label>
                <Input
                  id="mov_desc"
                  className="h-8"
                  placeholder={movementType === 'deposit' ? 'Ej: Pago semanal, seña...' : 'Ej: Productos fiados, cargo especial...'}
                  {...movementForm.register('description')}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setMovementType(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createMovementMutation.isPending}>
                {createMovementMutation.isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
