'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import {
  CreditCard,
  ArrowLeftRight,
  Smartphone,
  Settings2,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PackInactiveWarning } from '@/components/shared/pack-inactive-warning'
import { usePaymentMethods, useUpsertPaymentMethod, useTogglePaymentMethod } from '@/lib/hooks/use-payment-methods'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { enableModule, disableModule } from '@/lib/actions/modules'
import type { PaymentMethodRow } from '@/lib/actions/payment-methods'
import type { ModuleName } from '@/lib/types'

type TransferForm = {
  cbu: string
  alias: string
  holder: string
  bank: string
  instructions: string
}

type MpForm = {
  access_token: string
}

function PaymentMethodCard({
  type,
  method,
  onConfigure,
  onToggle,
  isTogglingId,
}: {
  type: 'transfer' | 'mp'
  method: PaymentMethodRow | undefined
  onConfigure: () => void
  onToggle: (id: string, is_active: boolean) => void
  isTogglingId: string | null
}) {
  const icon = type === 'transfer'
    ? <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
    : <Smartphone className="h-5 w-5 text-muted-foreground" />

  const defaultName = type === 'transfer' ? 'Transferencia bancaria' : 'Mercado Pago'

  const isConfigured = !!method
  const isActive = method?.is_active ?? false
  const isToggling = method ? isTogglingId === method.id : false

  return (
    <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{method?.name ?? defaultName}</p>
        <div className="mt-1">
          {isConfigured ? (
            <Badge variant={isActive ? 'default' : 'outline'} className="text-[10px]">
              {isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Sin configurar</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isConfigured && (
          <Switch
            checked={isActive}
            disabled={isToggling}
            onCheckedChange={(checked) => onToggle(method!.id, checked)}
            aria-label={`${isActive ? 'Desactivar' : 'Activar'} ${method?.name ?? defaultName}`}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onConfigure}
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span>{isConfigured ? 'Configurar' : 'Configurar'}</span>
        </Button>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  const [configSheet, setConfigSheet] = useState<'transfer' | 'mp' | null>(null)
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null)
  const [checkoutPending, startCheckoutTransition] = useTransition()

  const { modules } = useAdminContext()
  const { data: methods = [], isLoading } = usePaymentMethods()
  const upsertMutation = useUpsertPaymentMethod()
  const toggleMutation = useTogglePaymentMethod()

  const transferMethod = (methods as PaymentMethodRow[]).find((m) => m.type === 'transfer')
  const mpMethod = (methods as PaymentMethodRow[]).find((m) => m.type === 'mp')

  const checkoutEnabled = !!(modules as Record<string, boolean>).checkout

  const transferForm = useForm<TransferForm>({
    defaultValues: {
      cbu: '',
      alias: '',
      holder: '',
      bank: '',
      instructions: '',
    },
  })

  const mpForm = useForm<MpForm>({
    defaultValues: { access_token: '' },
  })

  function openTransferSheet() {
    const cfg = (transferMethod?.config ?? {}) as Record<string, string>
    transferForm.reset({
      cbu: cfg.cbu ?? '',
      alias: cfg.alias ?? '',
      holder: cfg.holder ?? '',
      bank: cfg.bank ?? '',
      instructions: (transferMethod?.instructions as string | null) ?? '',
    })
    setConfigSheet('transfer')
  }

  function openMpSheet() {
    const cfg = (mpMethod?.config ?? {}) as Record<string, string>
    mpForm.reset({ access_token: cfg.access_token ?? '' })
    setConfigSheet('mp')
  }

  async function onTransferSubmit(data: TransferForm) {
    await upsertMutation.mutateAsync({
      type: 'transfer',
      config: {
        cbu: data.cbu.trim(),
        alias: data.alias.trim() || null,
        holder: data.holder.trim(),
        bank: data.bank.trim() || null,
      },
      instructions: data.instructions.trim() || null,
    })
    setConfigSheet(null)
  }

  async function onMpSubmit(data: MpForm) {
    await upsertMutation.mutateAsync({
      type: 'mp',
      config: { access_token: data.access_token.trim() },
    })
    setConfigSheet(null)
  }

  function handleToggle(id: string, is_active: boolean) {
    setIsTogglingId(id)
    toggleMutation.mutate(
      { id, is_active },
      { onSettled: () => setIsTogglingId(null) },
    )
  }

  function handleCheckoutToggle(checked: boolean) {
    startCheckoutTransition(async () => {
      const result = checked
        ? await enableModule('checkout' as ModuleName)
        : await disableModule('checkout' as ModuleName)
      if (!result.success) toast.error('No se pudo actualizar el checkout')
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <h2 className="text-lg font-semibold leading-none">Medios de cobro</h2>
            <p className="text-xs text-muted-foreground mt-1">Configurá cómo tus clientes te pagan</p>
          </div>
        </div>
        <PackInactiveWarning
          requiredModule={'payments' as ModuleName}
          activeModules={modules as Record<ModuleName, boolean>}
        />
      </div>

      <div className="px-4 sm:px-6 space-y-6">
        {/* Checkout online toggle */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Checkout online</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permite que tus clientes completen pedidos desde el catálogo
              </p>
            </div>
            <Switch
              checked={checkoutEnabled}
              disabled={checkoutPending}
              onCheckedChange={handleCheckoutToggle}
              aria-label="Activar checkout online"
            />
          </div>
        </div>

        <Separator />

        {/* Métodos de pago */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Métodos disponibles
          </p>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[72px] w-full rounded-xl" />
              <Skeleton className="h-[72px] w-full rounded-xl" />
            </div>
          ) : (
            <>
              <PaymentMethodCard
                type="transfer"
                method={transferMethod}
                onConfigure={openTransferSheet}
                onToggle={handleToggle}
                isTogglingId={isTogglingId}
              />
              <PaymentMethodCard
                type="mp"
                method={mpMethod}
                onConfigure={openMpSheet}
                onToggle={handleToggle}
                isTogglingId={isTogglingId}
              />
            </>
          )}
        </div>
      </div>

      {/* Sheet: Transferencia bancaria */}
      <Sheet open={configSheet === 'transfer'} onOpenChange={(open) => !open && setConfigSheet(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              Transferencia bancaria
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cbu">CBU / CVU <span className="text-destructive">*</span></Label>
                <Input
                  id="cbu"
                  className="h-8 font-mono"
                  placeholder="22 dígitos"
                  {...transferForm.register('cbu', { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alias">Alias <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  id="alias"
                  className="h-8"
                  placeholder="mi.alias.banco"
                  {...transferForm.register('alias')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holder">Titular <span className="text-destructive">*</span></Label>
                <Input
                  id="holder"
                  className="h-8"
                  placeholder="Nombre del titular"
                  {...transferForm.register('holder', { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank">Banco <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  id="bank"
                  className="h-8"
                  placeholder="Ej: Banco Galicia"
                  {...transferForm.register('bank')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instructions">Instrucciones adicionales <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Textarea
                  id="instructions"
                  className="resize-none text-sm"
                  rows={3}
                  placeholder="Ej: Enviá el comprobante por WhatsApp"
                  {...transferForm.register('instructions')}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setConfigSheet(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: Mercado Pago */}
      <Sheet open={configSheet === 'mp'} onOpenChange={(open) => !open && setConfigSheet(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              Mercado Pago
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={mpForm.handleSubmit(onMpSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Encontrá tu Access Token en{' '}
                <span className="font-medium text-foreground">mercadopago.com → Tu negocio → Credenciales</span>.
                Usá las credenciales de producción para cobros reales.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="access_token">Access Token <span className="text-destructive">*</span></Label>
                <Input
                  id="access_token"
                  className="h-8 font-mono text-xs"
                  placeholder="APP_USR-..."
                  type="password"
                  {...mpForm.register('access_token', { required: true })}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setConfigSheet(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
