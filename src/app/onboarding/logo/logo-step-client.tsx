'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploader } from '@/components/shared/image-uploader'
import { onboardingStep2 } from '@/lib/actions/onboarding'
import { OnboardingSteps } from '../_components/onboarding-steps'
import type { ActionResult } from '@/lib/types'

const PRESET_COLORS = [
  '#1b1b1b',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#ea580c',
  '#16a34a',
  '#0891b2',
]

export function LogoStepClient({ storeId }: { storeId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(onboardingStep2, null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#1b1b1b')
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="space-y-6">
      <OnboardingSteps current={1} />

      <Card>
        <CardHeader>
          <CardTitle>Personalizá tu tienda</CardTitle>
          <CardDescription>
            Subí tu logo y elegí el color de marca. Podés cambiarlos cuando quieras.
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
            <input type="hidden" name="primary_color" value={primaryColor} />

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo <span className="text-muted-foreground font-normal">(opcional — 200×200 px recomendado)</span></Label>
              {storeId && (
                <ImageUploader
                  storeId={storeId}
                  folder="store"
                  maxFiles={1}
                  onUpload={(urls) => setLogoUrl(urls[0] ?? null)}
                />
              )}
            </div>

            {/* Color principal */}
            <div className="space-y-3">
              <Label>Color principal de tu marca</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPrimaryColor(color)}
                    className="relative w-8 h-8 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      backgroundColor: color,
                      borderColor: primaryColor === color ? color : 'transparent',
                      boxShadow: primaryColor === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                    }}
                    title={color}
                  >
                    {primaryColor === color && (
                      <Check className="h-3.5 w-3.5 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
                <div className="relative">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded-full cursor-pointer border-2 border-border p-0.5 bg-transparent"
                    title="Elegir color personalizado"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: primaryColor }} />
                <span>{primaryColor}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button render={<Link href="/onboarding/payment" />} variant="ghost" className="flex-1">
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
