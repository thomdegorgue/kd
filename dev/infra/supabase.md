# Supabase — Guía Operativa

> Cómo operar Supabase para este proyecto: SQL, RLS, Auth, Edge Functions, Storage.

---

## Configuración inicial (Fase 0)

### Crear el proyecto
- Región: **South America (São Paulo)** — latencia mínima para Argentina
- Plan Free para desarrollo, Pro para producción (Edge Functions con schedule)
- Guardar la Database Password en lugar seguro

### Obtener las keys
En Dashboard → Settings → API:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ solo servidor

### Configurar Auth
En Dashboard → Authentication → Providers → Email:
- Enable Email provider: **ON**
- Confirm email: **ON**
- Secure email change: **ON**

En Dashboard → Authentication → URL Configuration:
- Site URL: `http://localhost:3000` (dev) → cambiar a `https://kitdigital.ar` (prod)
- Redirect URLs (agregar todas):
  ```
  http://localhost:3000/auth/callback
  https://kitdigital.ar/auth/callback
  ```

---

## Ejecutar SQL (Fase 0.6)

**Cómo ejecutar el script del schema:**
1. Dashboard → SQL Editor → New snippet
2. Pegar el script completo de `/system/database/schema.md`
3. Click en Run
4. Verificar que no hay errores en el output

**Si hay error en el script:**
- Leer el mensaje de error completo (Supabase muestra la línea y el detalle)
- Los errores más comunes son: FK constraint fallida (orden incorrecto), tipo de dato incorrecto, nombre de función ya existe
- Corregir y volver a ejecutar (el `IF NOT EXISTS` en `CREATE TABLE` previene duplicados)

---

## Patrones de cliente Supabase para Next.js 15

### En Client Components (browser)
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

### En Server Components / Server Actions / Route Handlers
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        ),
      },
    }
  )
}
```

### En Middleware (Edge Runtime)
```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export const createClient = (request: NextRequest) => {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  return { supabase, response }
}
```

### Con Service Role Key (Route Handlers, Edge Functions)
```typescript
// Solo usar en el servidor. NUNCA en Client Components.
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

---

## Verificar RLS

**En SQL Editor — simular usuario autenticado:**
```sql
-- Testear que RLS bloquea acceso sin store_id
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "user-id-que-no-tiene-tienda"}';
SELECT * FROM products;
-- Debe retornar 0 filas

RESET role;
```

**Verificar que la política está bien configurada:**
```sql
-- Ver todas las políticas
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Auth: Callback route

```typescript
// src/app/auth/callback/route.ts
import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/admin'

  if (code) {
    const db = await createClient()
    const { error } = await db.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

---

## Storage (si se usa)

Para este proyecto, las imágenes van a **Cloudinary** (no Supabase Storage). Si en algún módulo futuro se necesita Supabase Storage:

```typescript
// Upload a Supabase Storage
const { data, error } = await db.storage
  .from('store-assets')
  .upload(`${storeId}/${filename}`, file, {
    upsert: true,
    contentType: file.type,
  })

// URL pública
const { data: { publicUrl } } = db.storage
  .from('store-assets')
  .getPublicUrl(`${storeId}/${filename}`)
```

---

## Realtime (no usado en Fase 0-4, disponible después)

```typescript
// Suscripción a cambios en tiempo real (solo si se necesita en fases avanzadas)
const channel = db
  .channel('store-orders')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'orders',
    filter: `store_id=eq.${storeId}`,
  }, (payload) => {
    // nuevo pedido recibido
    console.log('Nuevo pedido:', payload.new)
  })
  .subscribe()

// Cleanup
return () => { db.removeChannel(channel) }
```

---

## Migraciones

**No hay CLI de migraciones en este proyecto (por simplicidad).**
Todas las migraciones se ejecutan manualmente en el SQL Editor del Dashboard.

**Convención de archivos de migración:**
```
/supabase/migrations/
  001-initial-schema.sql
  002-add-column-xyz.sql
  003-add-index-abc.sql
```

Guardar los scripts en el repo para poder recrear la DB desde cero.

---

## Checklist de Supabase

- [ ] Proyecto creado en región São Paulo
- [ ] Auth Email configurado (Confirm email: ON)
- [ ] URL de callback configurada en Authentication Settings
- [ ] Script SQL del schema ejecutado sin errores
- [ ] 28 tablas confirmadas en Table Editor
- [ ] RLS habilitado en todas las tablas de dominio
- [ ] `SUPABASE_SERVICE_ROLE_KEY` en variables de entorno del servidor (no en `NEXT_PUBLIC_*`)
- [ ] Los 3 clientes de `@supabase/ssr` compilan sin errores
