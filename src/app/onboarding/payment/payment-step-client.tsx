'use client'

import { useState } from 'react'
import { Loader2, Check, Zap, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createOnboardingCheckout } from '@/lib/actions/onboarding'

type Plan = {
  price_per_100_products: number
  pro_module_price: number
  annual_discount_months: number
}

const ANNUAL_MODULES_INCLUDED = [
  'Stock', 'Envíos y tracking', 'Finanzas', 'Gastos', 'Cuenta de ahorro',
  'Equipo multiusuario', 'Dominio personalizado', 'Tareas', 'Variantes', 'Mayorista',
]

function formatARS(centavos: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(centavos / 100)
}

export function PaymentStepClient({ plan }: { plan: Plan | null }) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthlyPrice = plan ? plan.price_per_100_products : 200000
  const annualDiscount = plan?.annual_discount_months ?? 2
  const annualPrice = plan
    ? plan.price_per_100_products * (12 - annualDiscount)
    : monthlyPrice * (12 - 2)
  const annualPerMonth = Math.round(annualPrice / 12)

  async function handlePay() {
    setLoading(true)
    setError(null)
    const result = await createOnboardingCheckout(period)
    if (!result.success) {
      setError(result.error.message)
      setLoading(false)
      return
    }
    window.location.href = result.data.init_point
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Elegí tu plan</CardTitle>
          <CardDescription>Cancelás cuando quieras. Sin permanencia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          {/* Toggle mensual / anual */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPeriod('monthly')}
              className={[
                'rounded-xl border-2 p-4 text-left transition-all',
                period === 'monthly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Mensual</span>
                {period === 'monthly' && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
              </div>
              <p className="text-xl font-bold">{formatARS(monthlyPrice)}</p>
              <p className="text-xs text-muted-foreground">por mes</p>
            </button>

            <button
              onClick={() => setPeriod('annual')}
              className={[
                'rounded-xl border-2 p-4 text-left transition-all relative overflow-hidden',
                period === 'annual'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30',
              ].join(' ')}
            >
              <div className="absolute top-2 right-2">
                <span className="text-[10px] font-bold bg-green-100 text-green-700 rounded px-1.5 py-0.5">
                  -{annualDiscount} meses
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Anual</span>
                {period === 'annual' && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
              </div>
              <p className="text-xl font-bold">{formatARS(annualPerMonth)}</p>
              <p className="text-xs text-muted-foreground">por mes · {formatARS(annualPrice)}/año</p>
            </button>
          </div>

          {/* Módulos incluidos en plan anual */}
          {period === 'annual' && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Todos los módulos pro incluidos
              </p>
              <div className="grid grid-cols-2 gap-1">
                {ANNUAL_MODULES_INCLUDED.map((mod) => (
                  <div key={mod} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-green-600 shrink-0" />
                    {mod}
                  </div>
                ))}
              </div>
            </div>
          )}

          {period === 'monthly' && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Incluye catálogo, productos, categorías, carrito WhatsApp y gestión de pedidos. Podés sumar módulos adicionales desde el panel.
              </p>
            </div>
          )}

          <Button
            className="w-full font-semibold"
            size="lg"
            onClick={handlePay}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirigiendo a Mercado Pago...</>
            ) : (
              `Ir a pagar · ${period === 'annual' ? formatARS(annualPrice) : formatARS(monthlyPrice)}`
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Pago seguro con Mercado Pago. Podés cancelar cuando quieras.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
