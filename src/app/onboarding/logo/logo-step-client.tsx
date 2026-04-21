'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploader } from '@/components/shared/image-uploader'
import { onboardingStep2 } from '@/lib/actions/onboarding'
import { OnboardingSteps } from '../_components/onboarding-steps'
import type { ActionResult } from '@/lib/types'

export function LogoStepClient({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(onboardingStep2, null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="space-y-6">
      <OnboardingSteps current={1} />

      <Card>
        <CardHeader>
          <CardTitle>Subí tu logo</CardTitle>
          <CardDescription>
            Recomendamos 200×200 px con fondo blanco o transparente. Podés cambiarlo después desde Configuración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={action} className="space-y-6">
            {state && !state.success && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {state.error.message}
              </p>
            )}

            <input type="hidden" name="logo_url" value={logoUrl ?? ''} />

            {storeId && (
              <ImageUploader
                storeId={storeId}
                folder="store"
                maxFiles={1}
                onUpload={(urls) => {
                  setLogoUrl(urls[0] ?? null)
                }}
              />
            )}

            <div className="flex gap-3">
              <Button render={<Link href="/onboarding/product" />} variant="ghost" className="flex-1">
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
