'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sendPasswordReset } from '@/lib/actions/auth'
import type { ActionResult } from '@/lib/types'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(sendPasswordReset, null)

  if (state?.success) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Revisá tu email</CardTitle>
          <CardDescription className="text-center">
            Si el email existe, recibirás instrucciones para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
            Volver al inicio de sesión
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Recuperar contraseña</CardTitle>
        <CardDescription className="text-center">
          Ingresá tu email y te enviaremos instrucciones.
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

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar instrucciones
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-foreground underline underline-offset-4 hover:text-primary">
            Volver al inicio de sesión
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
