'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Copy,
  Check,
  MessageCircle,
  ShoppingBag,
  Palette,
  Share2,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { completeOnboarding, getOnboardingStatus } from '@/lib/actions/onboarding'

const NEXT_STEPS = [
  { icon: ShoppingBag, label: 'Agregá más productos a tu catálogo' },
  { icon: Palette, label: 'Personalizá los colores y el diseño' },
  { icon: Share2, label: 'Compartí el link con tus clientes' },
]

const MAX_POLL_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2000

type Props = {
  catalogUrl: string | null
  billingStatus: string | null
  mpStatus: 'success' | 'failure' | 'pending' | null
}

// ── Panel de éxito (billing active) ─────────────────────────

function SuccessPanel({ catalogUrl }: { catalogUrl: string | null }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    if (!catalogUrl) return
    await navigator.clipboard.writeText(catalogUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waMessage = catalogUrl
    ? encodeURIComponent(`¡Mirá mi catálogo digital! 🛍️ ${catalogUrl}`)
    : ''

  return (
    <div className="space-y-4">
      {catalogUrl && (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Link de tu catálogo
          </p>
          <p className="text-sm font-mono truncate">{catalogUrl}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={copyLink}>
              {copied
                ? <><Check className="h-4 w-4 mr-1.5 text-green-600" /> Copiado</>
                : <><Copy className="h-4 w-4 mr-1.5" /> Copiar link</>}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              render={<a href={`https://wa.me/?text=${waMessage}`} target="_blank" rel="noopener noreferrer" />}
            >
              <MessageCircle className="h-4 w-4 mr-1.5 text-green-600" />
              Compartir
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Próximos pasos</p>
        <ul className="space-y-2">
          {NEXT_STEPS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <form action={completeOnboarding}>
        <Button type="submit" className="w-full">
          Ir a mi panel →
        </Button>
      </form>
    </div>
  )
}

// ── Panel de polling (verificando pago) ───────────────────────

function PollingPanel({ onActivated, onTimeout }: { onActivated: () => void; onTimeout: () => void }) {
  const [attempts, setAttempts] = useState(0)

  const poll = useCallback(async () => {
    const status = await getOnboardingStatus()
    if (status.billing_status === 'active') {
      onActivated()
      return
    }
    setAttempts((prev) => {
      const next = prev + 1
      if (next >= MAX_POLL_ATTEMPTS) onTimeout()
      return next
    })
  }, [onActivated, onTimeout])

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [poll])

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <div>
        <p className="font-semibold text-lg">Verificando tu pago…</p>
        <p className="text-sm text-muted-foreground mt-1">
          Esto puede tomar unos segundos. No cierres esta página.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Intento {attempts + 1} de {MAX_POLL_ATTEMPTS}
      </p>
    </div>
  )
}

// ── Panel de error/timeout ────────────────────────────────────

function RetryPanel({ reason }: { reason: 'failure' | 'pending' | 'timeout' }) {
  const messages = {
    failure: {
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      title: 'El pago no se completó',
      desc: 'Podés intentarlo de nuevo o elegir otro método de pago.',
    },
    pending: {
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      title: 'Pago pendiente de confirmación',
      desc: 'Tu pago está siendo procesado. Una vez confirmado, tu tienda se activará automáticamente.',
    },
    timeout: {
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      title: 'Aún verificando',
      desc: 'El pago puede tardar un poco más. Si ya lo completaste, tu tienda se activará en minutos.',
    },
  }

  const { icon: Icon, color, bg, title, desc } = messages[reason]

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${bg}`}>
          <Icon className={`h-7 w-7 ${color}`} />
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        </div>
      </div>
      <Button render={<Link href="/onboarding/payment" />} className="w-full">
        Volver al pago
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        ¿Problemas? Escribinos por WhatsApp.
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export function DoneClient({ catalogUrl, billingStatus, mpStatus }: Props) {
  const [phase, setPhase] = useState<'polling' | 'success' | 'retry' | 'no-payment'>(() => {
    if (billingStatus === 'active') return 'success'
    if (mpStatus === 'success') return 'polling'
    if (mpStatus === 'failure') return 'retry'
    if (mpStatus === 'pending') return 'retry'
    return 'no-payment'
  })
  const [retryReason, setRetryReason] = useState<'failure' | 'pending' | 'timeout'>(
    mpStatus === 'failure' ? 'failure' : 'pending',
  )

  if (phase === 'success') {
    return (
      <Card>
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">¡Tu tienda está lista!</CardTitle>
          <CardDescription>
            Ya podés compartir tu catálogo y empezar a recibir pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SuccessPanel catalogUrl={catalogUrl} />
        </CardContent>
      </Card>
    )
  }

  if (phase === 'polling') {
    return (
      <Card>
        <CardContent className="pt-6">
          <PollingPanel
            onActivated={() => setPhase('success')}
            onTimeout={() => {
              setRetryReason('timeout')
              setPhase('retry')
            }}
          />
        </CardContent>
      </Card>
    )
  }

  if (phase === 'retry') {
    return (
      <Card>
        <CardContent className="pt-6">
          <RetryPanel reason={retryReason} />
        </CardContent>
      </Card>
    )
  }

  // no-payment: usuario sin pago completado
  return (
    <Card>
      <CardHeader className="text-center space-y-2">
        <CardTitle>Completá tu pago</CardTitle>
        <CardDescription>
          Para acceder al panel necesitás activar tu tienda con un plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button render={<Link href="/onboarding/payment" />} className="w-full">
          Elegir plan y pagar
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Pago seguro con Mercado Pago. Sin permanencia.
        </p>
      </CardContent>
    </Card>
  )
}
