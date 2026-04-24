'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signUp } from '@/lib/actions/auth'
import { slugify } from '@/lib/validations/auth'
import type { ActionResult } from '@/lib/types'

export default function SignupPage() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signUp, null)
  const [storeName, setStoreName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  useEffect(() => {
    if (!slugEdited && storeName) {
      setSlug(slugify(storeName))
    }
  }, [storeName, slugEdited])

  const fieldError = (field: string) =>
    state && !state.success && state.error.field === field ? state.error.message : null

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Crear tu tienda</CardTitle>
        <CardDescription className="text-center">
          Gratis, sin tarjeta de crédito
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
            <Label htmlFor="full_name">Tu nombre</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="María García"
              autoComplete="name"
              required
            />
            {fieldError('full_name') && (
              <p className="text-xs text-destructive">{fieldError('full_name')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
            {fieldError('email') && (
              <p className="text-xs text-destructive">{fieldError('email')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
            />
            {fieldError('password') && (
              <p className="text-xs text-destructive">{fieldError('password')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_name">Nombre de tu tienda</Label>
            <Input
              id="store_name"
              name="store_name"
              placeholder="Ej: Ropa de María"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
            {fieldError('store_name') && (
              <p className="text-xs text-destructive">{fieldError('store_name')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="store_slug">
              URL de tu catálogo
            </Label>
            <div className="flex items-center gap-0">
              <span className="h-9 rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground flex items-center whitespace-nowrap">
                kitdigital.ar/
              </span>
              <Input
                id="store_slug"
                name="store_slug"
                placeholder="mi-tienda"
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  setSlug(e.target.value)
                }}
                className="rounded-l-none"
                required
              />
            </div>
            {fieldError('store_slug') && (
              <p className="text-xs text-destructive">{fieldError('store_slug')}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear mi tienda gratis
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{' '}
          <Link href="/auth/login" className="text-foreground underline underline-offset-4 hover:text-primary">
            Ingresar
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
