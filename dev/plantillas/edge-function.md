# Template — Supabase Edge Function (Cron Job)

> Leer antes: `/system/flows/lifecycle.md`, `/system/backend/backend-rules.md` (Regla 10)
> Las Edge Functions de Supabase usan **Deno** (no Node.js). Imports diferentes.
> Ver `/dev/infra/supabase.md` para instrucciones de deploy.

---

## ⚠️ Diferencias clave Deno vs Node.js

```typescript
// Node.js (NO usar en Edge Functions)
import { createClient } from '@supabase/supabase-js'

// Deno (usar en Edge Functions de Supabase)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// o usando el import map de Supabase:
import { createClient } from 'jsr:@supabase/supabase-js@2'
```

---

## Template de Edge Function con schedule (cron)

```typescript
// supabase/functions/{nombre-funcion}/index.ts
// Deploy: supabase functions deploy {nombre-funcion}
// Schedule: se configura en Supabase Dashboard → Edge Functions → {nombre} → Cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// El runtime de Deno provee las env vars automáticamente
const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (_req) => {
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    await run(db)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[{nombre-funcion}] Error:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function run(db: ReturnType<typeof createClient>) {
  // {ADAPTAR}: lógica del cron job
}
```

---

## Cron 1: check_trial_expiry (diario 00:00 UTC)

```typescript
// supabase/functions/check-trial-expiry/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (_req) => {
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const now = new Date().toISOString()

    // Buscar tiendas demo con trial vencido y sin suscripción de MP
    const { data: expired, error } = await db
      .from('stores')
      .select('id, name')
      .eq('billing_status', 'demo')
      .lt('trial_ends_at', now)
      .is('mp_subscription_id', null)

    if (error) throw error
    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }))
    }

    console.log(`[check-trial-expiry] Procesando ${expired.length} tiendas vencidas`)

    // Procesar en batches de 10 para no sobrecargar la DB
    for (const store of expired) {
      await db.from('stores').update({
        billing_status:         'past_due',
        last_billing_failure_at: now,
      }).eq('id', store.id)

      await db.from('events').insert({
        store_id:   store.id,
        type:       'billing_trial_expired',
        actor_type: 'system',
        actor_id:   null,
        data:       { store_name: store.name, expired_at: now },
      })
    }

    return new Response(JSON.stringify({ ok: true, processed: expired.length }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[check-trial-expiry] Error:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

---

## Cron 2: archive_inactive_stores (diario 12:00 UTC)

```typescript
// supabase/functions/archive-inactive-stores/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (_req) => {
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    // 30 días de gracia en past_due antes de archivar
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: toArchive, error } = await db
      .from('stores')
      .select('id, name')
      .eq('billing_status', 'past_due')
      .lt('last_billing_failure_at', thirtyDaysAgo)

    if (error) throw error
    if (!toArchive || toArchive.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }))
    }

    const now = new Date().toISOString()
    console.log(`[archive-inactive-stores] Archivando ${toArchive.length} tiendas`)

    for (const store of toArchive) {
      await db.from('stores').update({
        billing_status: 'archived',
      }).eq('id', store.id)

      await db.from('events').insert({
        store_id:   store.id,
        type:       'billing_store_archived',
        actor_type: 'system',
        actor_id:   null,
        data:       { store_name: store.name, archived_at: now },
      })
    }

    return new Response(JSON.stringify({ ok: true, processed: toArchive.length }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[archive-inactive-stores] Error:', error)
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
    })
  }
})
```

---

## Cron 3: cleanup_assistant_sessions (diario 03:00 UTC)

```typescript
// supabase/functions/cleanup-assistant-sessions/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (_req) => {
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error, count } = await db
    .from('assistant_sessions')
    .delete({ count: 'exact' })
    .lt('expires_at', new Date().toISOString())

  if (error) {
    console.error('[cleanup-assistant-sessions] Error:', error)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }

  // assistant_messages se eliminan en cascada (FK con ON DELETE CASCADE)
  console.log(`[cleanup-assistant-sessions] Eliminadas ${count ?? 0} sesiones vencidas`)
  return new Response(JSON.stringify({ ok: true, deleted: count ?? 0 }))
})
```

---

## Deploy y configuración de schedule

```bash
# 1. Instalar Supabase CLI (si no está)
npm install -g supabase

# 2. Login y link al proyecto
supabase login
supabase link --project-ref {PROJECT_REF}

# 3. Deploy de una función
supabase functions deploy check-trial-expiry
supabase functions deploy archive-inactive-stores
supabase functions deploy cleanup-assistant-sessions
```

**Configurar schedule en Supabase Dashboard:**
1. Ir a Edge Functions → {nombre-función} → Schedule
2. Configurar el cron expression:
   - `check-trial-expiry`: `0 0 * * *` (todos los días 00:00 UTC)
   - `archive-inactive-stores`: `0 12 * * *` (todos los días 12:00 UTC)
   - `cleanup-assistant-sessions`: `0 3 * * *` (todos los días 03:00 UTC)

---

## Checklist de Edge Function

- [ ] Usa `https://esm.sh/@supabase/supabase-js@2` (Deno, no Node.js)
- [ ] Usa `SUPABASE_SERVICE_ROLE_KEY` (no el anon key)
- [ ] Tiene manejo de errores con `try/catch` y logging
- [ ] Siempre retorna `Response` con JSON válido
- [ ] Procesa en batches (no en un solo bulk) para tablas grandes
- [ ] Emite eventos de auditoría en tabla `events` con `actor_type: 'system'`
- [ ] Schedule configurado en el Dashboard después del deploy
- [ ] Testeado manualmente con `supabase functions invoke {nombre}` antes de activar schedule
