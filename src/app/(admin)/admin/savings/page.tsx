'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, ArrowDown, ArrowUp, PiggyBank } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  useSavingsAccounts,
  useSavingsMovements,
  useCreateSavingsAccount,
  useCreateSavingsMovement,
} from '@/lib/hooks/use-savings'
import {
  createSavingsAccountSchema,
  createSavingsMovementSchema,
  type CreateSavingsAccountInput,
  type CreateSavingsMovementInput,
} from '@/lib/validations/savings'
import { useCurrency } from '@/lib/hooks/use-currency'
import { EmptyState } from '@/components/shared/empty-state'
import { PackInactiveWarning } from '@/components/shared/pack-inactive-warning'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import type { ModuleName } from '@/lib/types'

export default function SavingsPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [movementType, setMovementType] = useState<'deposit' | 'withdrawal' | null>(null)

  const { data: accounts = [], isLoading } = useSavingsAccounts()
  const { data: movements = [] } = useSavingsMovements(selectedAccountId ?? '')
  const createAccountMutation = useCreateSavingsAccount()
  const createMovementMutation = useCreateSavingsMovement()
  const { formatPrice } = useCurrency()
  const { modules } = useAdminContext()

  const accountsTyped = accounts as Record<string, unknown>[]
  const totalBalance = accountsTyped.reduce((sum, a) => sum + (a.balance as number), 0)

  const selectedAccount = accountsTyped.find(
    (a) => a.id === selectedAccountId
  )

  const accountForm = useForm<CreateSavingsAccountInput & { target_pesos?: number }>({
    resolver: zodResolver(
      createSavingsAccountSchema
        .extend({ target_pesos: createSavingsAccountSchema.shape.target_amount.optional() })
        .omit({ target_amount: true })
    ),
    defaultValues: { name: '' },
  })

  const movementForm = useForm<Omit<CreateSavingsMovementInput, 'amount' | 'type' | 'account_id'> & { amount_pesos: number }>({
    resolver: zodResolver(
      createSavingsMovementSchema
        .extend({ amount_pesos: createSavingsMovementSchema.shape.amount })
        .omit({ amount: true, type: true, account_id: true })
    ),
    defaultValues: { description: '' },
  })

  async function onSubmitAccount(data: CreateSavingsAccountInput & { target_pesos?: number }) {
    await createAccountMutation.mutateAsync({
      name: data.name,
      description: data.description,
      target_amount: data.target_pesos ? Math.round(data.target_pesos * 100) : undefined,
    })
    accountForm.reset()
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <PiggyBank className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Cuentas de ahorro</h2>
              <p className="text-xs text-muted-foreground mt-1">{accountsTyped.length} cuentas</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowNewAccount(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva cuenta
          </Button>
        </div>

        <PackInactiveWarning
          requiredModule={'savings_account' as ModuleName}
          activeModules={modules as Record<ModuleName, boolean>}
        />

        {/* Total general */}
        {accountsTyped.length > 1 && (
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
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
            icon={<PiggyBank className="h-12 w-12" />}
            title="Sin cuentas de ahorro"
            description="Creá una cuenta para empezar a separar dinero para tus objetivos."
            action={
              <Button size="sm" onClick={() => setShowNewAccount(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva cuenta
              </Button>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {accountsTyped.map((account) => {
              const balance = account.balance as number
              const target = account.target_amount as number | null
              const progress = target ? Math.min(100, (balance / target) * 100) : null
              const isSelected = selectedAccountId === account.id

              return (
                <Card
                  key={account.id as string}
                  className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                  onClick={() => setSelectedAccountId(isSelected ? null : account.id as string)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{account.name as string}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-2xl font-bold tabular-nums">{formatPrice(balance)}</p>
                    {target && (
                      <>
                        <Progress value={progress ?? 0} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          Meta: {formatPrice(target)} ({Math.round(progress ?? 0)}%)
                        </p>
                      </>
                    )}
                    {isSelected && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); setMovementType('deposit') }}
                        >
                          <ArrowDown className="h-3.5 w-3.5 mr-1" />
                          Depositar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => { e.stopPropagation(); setMovementType('withdrawal') }}
                        >
                          <ArrowUp className="h-3.5 w-3.5 mr-1" />
                          Retirar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Movements list for selected account */}
        {selectedAccount && (movements as Record<string, unknown>[]).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Movimientos — {selectedAccount.name as string}
            </h3>
            <div className="divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
              {(movements as Record<string, unknown>[]).map((m) => (
                <div key={m.id as string} className="flex items-center justify-between p-3">
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
                        {(m.description as string | null) ?? (m.type === 'deposit' ? 'Depósito' : 'Retiro')}
                      </p>
                      {Boolean(m.created_at) && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.created_at as string).toLocaleDateString('es-AR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`tabular-nums text-sm font-semibold ${m.type === 'deposit' ? 'text-emerald-600' : 'text-destructive'}`}>
                    {m.type === 'deposit' ? '+' : '-'}{formatPrice(m.amount as number)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheet para nueva cuenta */}
      <Sheet open={showNewAccount} onOpenChange={setShowNewAccount}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-muted-foreground" />
              Nueva cuenta de ahorro
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={accountForm.handleSubmit(onSubmitAccount)} className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...accountForm.register('name')} placeholder="Ej: Fondo de emergencia" />
              {accountForm.formState.errors.name && (
                <p className="text-xs text-destructive">{accountForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_pesos">Meta ($) — opcional</Label>
              <Input
                id="target_pesos"
                type="number"
                step="0.01"
                min={0.01}
                placeholder="Ej: 50000"
                {...accountForm.register('target_pesos', { valueAsNumber: true })}
              />
            </div>
            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowNewAccount(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAccountMutation.isPending}>
                {createAccountMutation.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet para movimiento */}
      <Sheet open={!!movementType} onOpenChange={(open) => !open && setMovementType(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {movementType === 'deposit' ? (
                <>
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                  Depositar
                </>
              ) : (
                <>
                  <ArrowUp className="h-5 w-5 text-muted-foreground" />
                  Retirar
                </>
              )}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={movementForm.handleSubmit(onSubmitMovement)} className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount_pesos">Monto ($)</Label>
              <Input
                id="amount_pesos"
                type="number"
                step="0.01"
                min={0.01}
                {...movementForm.register('amount_pesos', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mov_desc">Descripción (opcional)</Label>
              <Input id="mov_desc" {...movementForm.register('description')} />
            </div>
            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setMovementType(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMovementMutation.isPending}>
                {createMovementMutation.isPending ? 'Guardando...' : 'Confirmar'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
