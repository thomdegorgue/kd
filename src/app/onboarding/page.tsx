'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { onboardingStep1 } from '@/lib/actions/onboarding'
import { OnboardingSteps } from './_components/onboarding-steps'
import type { ActionResult } from '@/lib/types'

export default function OnboardingPage() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(onboardingStep1, null)

  const fieldError = (field: string) =>
    state && !state.success && state.error.field === field ? state.error.message : null

  return (
    <div className="space-y-6">
      <OnboardingSteps current={0} />

      <Card>
        <CardHeader>
          <CardTitle>¡Bienvenido/a a KitDigital!</CardTitle>
          <CardDescription>
            Configuremos tu tienda. Todo esto lo podés cambiar después.
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
              />
              {fieldError('name') && <p className="text-xs text-destructive">{fieldError('name')}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="flex items-center gap-0">
                <span className="h-9 rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground flex items-center">
                  +54
                </span>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  placeholder="1123456789"
                  className="rounded-l-none"
                />
              </div>
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
