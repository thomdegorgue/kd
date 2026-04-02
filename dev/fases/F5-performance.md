# F5 — Performance y Estabilidad · Runbook

**Objetivo:** el sistema escala a miles de tiendas sin degradación.

---

## Precondiciones

- [ ] Fase 4 completada
- [ ] Variables Upstash configuradas: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

## Docs a leer

```
/system/backend/backend-rules.md        ← Regla 7 (rate limiting), Regla 9 (cache)
/dev/infra/servicios.md                 ← sección Upstash Redis
```

---

## PASO 5.1 — Cache con Upstash Redis

**Archivos:**
- `src/lib/cache/redis.ts` — cliente + helper `getOrSet` (ver `/dev/infra/servicios.md`)
- `src/lib/cache/ratelimit.ts` — rate limiters

**Implementar `invalidateCache` en el executor** (reemplazar el no-op de Fase 0):
```typescript
// src/lib/executor/index.ts
async function invalidateCache(keys: string[], storeId: string) {
  const { redis } = await import('@/lib/cache/redis')
  const resolvedKeys = keys.map(k => k.replace('{store_id}', storeId))
  await Promise.all(resolvedKeys.map(k => redis.del(k)))
}
```

**Aplicar cache a las queries más frecuentes de la vitrina:**
```typescript
// En src/app/(public)/[slug]/page.tsx
import { redis, cacheKeys } from '@/lib/cache/redis'

// Cache de productos públicos (TTL: 5 minutos)
const products = await redis.get(cacheKeys.storeProducts(store.id)) ??
  await fetchAndCacheProducts(db, store.id)
```

**Keys de cache** (del executor → `invalidates`):
- `store:{store_id}:products:public` — invalidado en create/update/delete product
- `store:{store_id}:categories` — invalidado en create/update/delete/reorder category
- `store:{store_id}:config` — invalidado en update_store_config

---

## PASO 5.2 — Rate limiting en middleware

**Agregar al `src/middleware.ts`:**
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { redis }     from '@/lib/cache/redis'

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,  // ver métricas en Upstash Console
})

// En el middleware, antes de procesar:
// Solo aplicar rate limiting a rutas API (no a páginas)
if (pathname.startsWith('/api/')) {
  const identifier = user?.id ?? request.ip ?? 'anonymous'
  const { success } = await ratelimit.limit(`api:${identifier}`)
  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60' },
    })
  }
}
```

**Límites específicos:**
| Endpoint | Límite |
|---------|--------|
| `/api/assistant` | 10 req/min por usuario |
| `/api/webhooks/*` | 20 req/seg (MP puede hacer retries) |
| `/api/*` (general) | 100 req/min por usuario |

---

## PASO 5.3 — Optimizaciones de queries

**Revisar queries N+1:**
- En listado de productos con categorías: usar `select('*, product_categories(category_id)')` en una sola query
- En listado de pedidos con items: usar `select('*, order_items(*)')` o query separada con IN

**Verificar índices según queries frecuentes:**
```sql
-- Índices que deben existir (verificar en Supabase)
CREATE INDEX IF NOT EXISTS idx_products_store_active     ON products(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_store_status       ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_store_created      ON orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_store_type         ON events(store_id, type);
CREATE INDEX IF NOT EXISTS idx_billing_payments_store    ON billing_payments(store_id, created_at DESC);
```

**Paginación en listas grandes (si hay > 100 items):**
```typescript
// Cursor-based pagination para listas del panel
const { data } = await db
  .from('orders')
  .select('*')
  .eq('store_id', storeId)
  .order('created_at', { ascending: false })
  .limit(20)
  .range(page * 20, (page + 1) * 20 - 1)
```

---

## PASO 5.4 — Monitoreo

**Logging estructurado en el executor** (mejorar el existente):
```typescript
// Ya existe en el executor, verificar que sea suficientemente descriptivo:
console.error('[executor] Error en ejecución:', {
  action:   params.name,
  store_id: params.store_id,
  actor:    params.actor.type,
  error:    error instanceof Error ? error.message : String(error),
  stack:    error instanceof Error ? error.stack : undefined,
})
```

**Sentry (opcional, recomendado para producción):**
```bash
npm install @sentry/nextjs
```
Seguir la guía de Sentry para Next.js App Router. Configurar alertas para errores en el webhook handler.

---

## Checklist de completitud de Fase 5

```
[ ] Redis conectado: getOrSet funciona en una query de prueba
[ ] Cache aplicado en queries de vitrina pública (productos, categorías)
[ ] invalidateCache ejecuta en el executor después de mutaciones
[ ] Rate limiting activo: 429 al exceder límite
[ ] Índices de queries frecuentes verificados en Supabase
[ ] No hay queries N+1 sin resolver
[ ] npm run build: bundle size revisado
```

---

## Al finalizar

1. Actualizar `ESTADO.md`
2. Commit: `feat(fase-5): performance — cache redis, rate limiting, índices`
3. → Siguiente: [`/dev/fases/F6-ia.md`](/dev/fases/F6-ia.md)
