'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { onboardingStep3 } from '@/lib/actions/onboarding'
import { OnboardingSteps } from '../_components/onboarding-steps'
import type { ActionResult } from '@/lib/types'

export default function OnboardingProductPage() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(onboardingStep3, null)

  const fieldError = (field: string) =>
    state && !state.success && state.error.field === field ? state.error.message : null

  return (
    <div className="space-y-6">
      <OnboardingSteps current={2} />

      <Card>
        <CardHeader>
          <CardTitle>Agregá tu primer producto</CardTitle>
          <CardDescription>
            Mostrá lo que vendés. Podés agregar más desde el panel.
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
              <Label htmlFor="name">Nombre del producto</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ej: Remera básica blanca"
                required
              />
              {fieldError('name') && <p className="text-xs text-destructive">{fieldError('name')}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio (ARS)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                required
              />
              {fieldError('price') && <p className="text-xs text-destructive">{fieldError('price')}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Contá un poco sobre este producto..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button render={<Link href="/onboarding/done" />} variant="ghost" className="flex-1">
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
