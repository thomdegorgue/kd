import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { StoreContext, ModuleName, StoreStatus, StoreUserRole } from '@/lib/types'

// ============================================================
// HELPERS
// ============================================================

/**
 * Extrae el slug de la tienda según el entorno:
 * - Prod: subdominio {slug}.kitdigital.ar o custom_domain
 * - Dev: primer segmento del path /{slug}/*
 */
function resolveSlug(request: NextRequest): string | null {
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // Path-based: localhost:3000/{slug}/*
    const pathname = request.nextUrl.pathname
    const segments = pathname.split('/').filter(Boolean)

    // Excluir rutas del sistema
    if (
      segments.length === 0 ||
      segments[0] === 'admin' ||
      segments[0] === 'superadmin' ||
      segments[0] === 'api' ||
      segments[0] === '_next' ||
      segments[0] === 'tracking' ||
      segments[0] === 'invite' ||
      segments[0] === 'auth' ||
      segments[0] === 'onboarding' ||
      segments[0] === 'design'
    ) {
      return null
    }

    return segments[0]
  }

  // Prod: Host header
  const host = request.headers.get('host') ?? ''
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'

  // Subdominio: {slug}.kitdigital.ar
  if (host.endsWith(`.${appDomain}`)) {
    return host.replace(`.${appDomain}`, '')
  }

  return null
}

/**
 * Crea un cliente Supabase para el middleware (sin cookies de escritura en rutas públicas).
 */
function createMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { client, response }
}

// ============================================================
// MIDDLEWARE PRINCIPAL
// ============================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar assets y rutas internas de Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ──────────────────────────────────────────────
  // RUTAS PÚBLICAS DEL SISTEMA — sin autenticación
  // ──────────────────────────────────────────────
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/design')
  ) {
    return NextResponse.next()
  }

  const { client, response } = createMiddlewareClient(request)

  // ──────────────────────────────────────────────
  // ONBOARDING — requiere sesión pero NO store_user
  // ──────────────────────────────────────────────
  if (pathname.startsWith('/onboarding')) {
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?next=/onboarding', request.url))
    }
    return response
  }

  // ──────────────────────────────────────────────
  // RUTAS SUPERADMIN — requiere sesión + role=superadmin
  // ──────────────────────────────────────────────
  if (pathname.startsWith('/superadmin')) {
    const { data: { user } } = await client.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?next=/superadmin', request.url))
    }

    // Verificar role en tabla users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: userData } = await (client as any)
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return response
  }

  // ──────────────────────────────────────────────
  // RUTAS ADMIN — requiere sesión + store_user
  // ──────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const { data: { user } } = await client.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?next=/admin', request.url))
    }

    // Obtener la tienda activa del usuario
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: storeUser } = await (client as any)
      .from('store_users')
      .select(`
        role,
        store:stores (
          id, slug, status, billing_status, modules, limits
        )
      `)
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!storeUser || !storeUser.store) {
      // Usuario sin tienda — redirigir a onboarding o error
      return NextResponse.redirect(new URL('/auth/no-store', request.url))
    }

    const store = storeUser.store

    // Construir StoreContext e inyectarlo en headers
    const storeContext: StoreContext = {
      store_id: store.id,
      slug: store.slug,
      status: store.status as StoreStatus,
      billing_status: (store.billing_status ?? store.status) as StoreStatus,
      modules: (store.modules as Partial<Record<ModuleName, boolean>>) ?? {},
      limits: (store.limits as StoreContext['limits']) ?? {
        max_products: 30,
        max_orders: 100,
        ai_tokens: 0,
      },
      user_id: user.id,
      user_role: storeUser.role as StoreUserRole,
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-store-context', JSON.stringify(storeContext))
    requestHeaders.set('x-user-id', user.id)

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // ──────────────────────────────────────────────
  // RUTAS PÚBLICAS (catálogo) — sin autenticación
  // ──────────────────────────────────────────────

  // En dev, las rutas /{slug}/* se procesan sin auth
  // En prod, el subdominio ya está resuelto por el Host header
  const slug = resolveSlug(request)
  if (slug) {
    // Solo inyectamos el slug para que el Server Component lo use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-store-slug', slug)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
