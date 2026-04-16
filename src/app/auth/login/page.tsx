'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signIn } from '@/lib/actions/auth'
import type { ActionResult } from '@/lib/types'

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signIn, null)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Ingresar</CardTitle>
        <CardDescription className="text-center">
          Accedé a tu panel de administración
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state && !state.success && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {state.error.message}
            </p>
          )}

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ingresar
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{' '}
          <Link href="/auth/signup" className="text-foreground underline underline-offset-4 hover:text-primary">
            Registrate gratis
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
