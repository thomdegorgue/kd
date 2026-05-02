'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { onboardingStep1 } from '@/lib/actions/onboarding'
import { OnboardingSteps } from './_components/onboarding-steps'
import type { ActionResult } from '@/lib/types'

const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export default function OnboardingPage() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(onboardingStep1, null)
  const [storeName, setStoreName] = useState('')

  const fieldError = (field: string) =>
    state && !state.success && state.error.field === field ? state.error.message : null

  const slug = slugify(storeName)

  return (
    <div className="space-y-6">
      <OnboardingSteps current={0} />

      <Card>
        <CardHeader>
          <CardTitle>¿Cómo se llama tu negocio?</CardTitle>
          <CardDescription>
            Contanos un poco sobre lo que vendés para armar tu catálogo automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            {state && !state.success && !state.error.field && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {state.error.message}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre de tu tienda</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ej: Ropa de María"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
              {fieldError('name') && <p className="text-xs text-destructive">{fieldError('name')}</p>}
              {slug && (
                <p className="text-xs text-muted-foreground">
                  Tu catálogo estará en:{' '}
                  <span className="font-mono text-foreground">
                    {process.env.NODE_ENV === 'development' ? `${appDomain}/${slug}` : `${slug}.${appDomain}`}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">¿Qué vendés?</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Ej: Vendo ropa de mujer, principalmente vestidos y blusas de temporada. Trabajo con talles del S al XXL."
                rows={3}
                required
              />
              {fieldError('description') && <p className="text-xs text-destructive">{fieldError('description')}</p>}
              <p className="text-xs text-muted-foreground">
                Usamos esto para crear tu primer producto automáticamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                placeholder="5491155555555"
              />
              <p className="text-xs text-muted-foreground">Con código de país, sin + ni espacios. Ej: 5491155555555 (Argentina)</p>
              {fieldError('whatsapp') && <p className="text-xs text-destructive">{fieldError('whatsapp')}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button render={<Link href="/onboarding/logo" />} variant="ghost" className="flex-1">
                Omitir
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
