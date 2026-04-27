import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Callback handler para Supabase Auth.
 *
 * Supabase redirige aquí después de:
 * - Confirmación de email
 * - Reset de contraseña
 * - OAuth (si se agrega en el futuro)
 *
 * Intercambia el ?code= de la URL por una sesión real y redirige al destino.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/admin'
  // Solo paths relativos sin protocolo (evita redirección abierta a dominios externos)
  const next = /^\/[^/]/.test(rawNext) ? rawNext : '/admin'
  const type = searchParams.get('type')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Si viene de un reset de contraseña, ir a la página de nueva contraseña
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      // Confirmación de email o login → ir al destino
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error: redirigir a login con mensaje
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
