# Verificación — Protocolo de "Done"

> Cómo verificar que un paso o tarea está completo antes de avanzar.
> Cada tipo de tarea tiene su propio protocolo de verificación.

---

## Verificación Universal (aplica a todo)

Antes de declarar cualquier cosa como "done", ejecutar:

```bash
# 1. TypeScript sin errores
npx tsc --noEmit

# 2. Build sin errores
npm run build

# 3. Dev server arranca
npm run dev
```

Si alguno falla → no está done.

---

## Verificación por tipo de artefacto

### Handler del executor

```typescript
// Verificación 1: el handler está registrado
import { registry } from '@/lib/executor/registry'
const handler = registry.get('nombre_de_la_action')
console.log(handler) // debe ser el objeto, no undefined

// Verificación 2: el handler rechaza input inválido
const result = await executor({
  name: 'nombre_de_la_action',
  store_id: 'test-store-id',
  actor: { type: 'user', id: 'test-user-id' },
  input: {}, // input vacío/inválido
})
// result.success debe ser false con code: 'INVALID_INPUT'

// Verificación 3: el handler ejecuta con input válido
// (hacer un test manual desde el panel o desde una ruta de test)
```

**Checklist:**
- [ ] El handler tiene `name`, `requires`, `permissions`, `event_type`, `invalidates`, `validate`, `execute`
- [ ] El `name` cumple el patrón `{verbo}_{entidad}` de `domain-language.md`
- [ ] El `event_type` está declarado en `events.md`
- [ ] El `validate` retorna `{ success: false }` con input inválido
- [ ] El `execute` hace `.eq('store_id', ctx.store_id)` en toda query
- [ ] No hay `any` explícito en el archivo

---

### Migración SQL (tablas + RLS)

Verificar en **Supabase Dashboard → Table Editor**:

```sql
-- Verificación 1: las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Contar: deben ser exactamente 28

-- Verificación 2: RLS está habilitado en tablas de dominio
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- rowsecurity = true en todas las tablas de dominio

-- Verificación 3: las políticas existen
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificación 4: los índices existen
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Checklist:**
- [ ] 28 tablas exactas (ver lista en `schema.md`)
- [ ] RLS habilitado en todas las tablas con `store_id`
- [ ] `billing_webhook_log` sin política (solo service role)
- [ ] `events` con política `INSERT` only para usuarios
- [ ] Todos los índices de `schema.md` existen
- [ ] El trigger `updated_at` existe y está aplicado a las tablas correctas

---

### Clientes de Supabase

```typescript
// Verificación: los 3 clientes compilan
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
// El de middleware se verifica indirectamente via middleware.ts

// Test de conexión (en una Server Action o page):
const db = await createServerClient()
const { data, error } = await db.from('stores').select('count').limit(1)
console.log({ data, error }) // error debe ser null
```

**Checklist:**
- [ ] `createClient` en `client.ts` usa `createBrowserClient` de `@supabase/ssr`
- [ ] `createClient` en `server.ts` usa `createServerClient` y `cookies()` de `next/headers`
- [ ] `createClient` en `middleware.ts` no importa `cookies` (usa `request.cookies`)
- [ ] Ningún archivo tiene `SUPABASE_SERVICE_ROLE_KEY` en un path `NEXT_PUBLIC_*`

---

### Middleware de Next.js

**Checklist de comportamiento:**
- [ ] `GET /admin` sin cookie de sesión → redirige a `/login` (verificar en browser)
- [ ] `GET /superadmin` sin cookie de sesión → redirige a `/login`
- [ ] `GET /superadmin` con sesión de usuario normal → responde 403
- [ ] `GET /` → no redirige (ruta pública)
- [ ] Las cookies de Supabase Auth se actualizan correctamente (no hay loops de redirect)

---

### Páginas del panel admin

**Checklist:**
- [ ] La ruta existe y responde sin errores (`200 OK`)
- [ ] En mobile (375px): layout usa `BottomNav`, no sidebar
- [ ] En desktop (1280px): layout usa `Sidebar`
- [ ] Si el módulo no está activo: muestra `ModuleLockedState`, no página en blanco
- [ ] Si no hay datos: muestra `EmptyState` con CTA
- [ ] El `PageHeader` tiene título y descripción correctos
- [ ] No hay `console.error` en los logs de dev (excepto los explícitos del executor)

---

### Componentes de UI

**Checklist:**
- [ ] Renderiza sin errores en dev
- [ ] Funciona en mobile (verificar en DevTools con viewport 375px)
- [ ] No tiene lógica de negocio embebida (solo props y callbacks)
- [ ] Los tipos de props están definidos (no `any`, no props sin tipo)
- [ ] Usa tokens de Tailwind del design system (`brand-500`, `success-500`, etc.) y no colores hardcodeados

---

### Server Action

**Checklist:**
- [ ] Tiene `'use server'` al inicio
- [ ] El `store_id` se resuelve del servidor (no del cliente)
- [ ] Llama a `executor()` para operaciones de escritura
- [ ] Retorna `ActionResult` con `success: true | false`
- [ ] Si falla, retorna un error tipado (no `throw new Error`)
- [ ] No tiene `console.log` (solo `console.error` para errores reales)

---

### Hook de TanStack Query

**Checklist:**
- [ ] El `queryKey` incluye el `store_id` o identificador relevante
- [ ] El `staleTime` está configurado (no usar el default infinito)
- [ ] El `queryFn` llama a una Server Action, no a Supabase directamente desde el cliente
- [ ] Maneja los estados `isLoading`, `isError`, `data` explícitamente en el componente

---

### Vitrina pública

**Checklist:**
- [ ] Accesible en `{slug}.localhost:3000` (o con `/` + slug en desarrollo)
- [ ] Tienda no existente → responde 404
- [ ] Tienda `suspended` o `archived` → muestra página de tienda inactiva (no 404)
- [ ] Productos activos visibles, inactivos no visibles
- [ ] En mobile (375px): grid de productos funciona correctamente
- [ ] ISR configurado: `export const revalidate = 60`

---

### Webhook handler (Mercado Pago)

**Checklist:**
- [ ] Verifica firma HMAC-SHA256 antes de procesar
- [ ] Si firma inválida → retorna 401 inmediatamente
- [ ] Verifica idempotencia en `billing_webhook_log` (mismo `mp_event_id` → 200 sin procesar)
- [ ] Registra el evento en `billing_webhook_log` con status `processed` al finalizar
- [ ] Retorna `200 OK` incluso si el evento es desconocido (para no generar reintentos de MP)
- [ ] No tiene lógica de billing hardcodeada: usa las actions del executor

---

## Checklist de completitud por fase

### Fase 0 — Fundación

```
[ ] npm run dev funciona sin errores
[ ] npx tsc --noEmit → 0 errores
[ ] 28 tablas en Supabase con RLS
[ ] 3 clientes de Supabase compilan
[ ] Executor importable desde cualquier archivo de servidor
[ ] Registry vacío (no hay handlers aún)
[ ] Middleware: /admin sin sesión → /login
[ ] 8 componentes admin base renderizan en /admin
[ ] TanStack Query devtools visible en dev
[ ] Tailwind: clase brand-500 aplica color correcto
```

### Fase 1 — Producto Base

```
[ ] Registro de usuario → email de confirmación llega
[ ] Login → sesión persiste entre recargas
[ ] Crear tienda → store en DB, store_users con role=owner
[ ] Setup guiado funciona (stepper de 4 pasos)
[ ] create_product handler registrado y funcional
[ ] create_category handler registrado y funcional
[ ] /admin/products: CRUD completo con imágenes en Cloudinary
[ ] /admin/categories: CRUD con reordenamiento
[ ] {slug}.localhost:3000 muestra vitrina correcta
[ ] Carrito: agregar, modificar cantidad, eliminar
[ ] Botón WhatsApp: genera mensaje correcto con productos y total
```

### Fase 2 — Contenido

```
[ ] /admin/configuracion: tabs General, WhatsApp, Apariencia, Redes funcionan
[ ] Logo y cover suben a Cloudinary
[ ] Color primario de vitrina se aplica en tiempo real
[ ] Banners: CRUD + toggle + reordenamiento
[ ] Banners visibles en vitrina si módulo activo
[ ] Social links: CRUD + reordenamiento
[ ] Links en footer de vitrina
```

### Fase 3 — Billing

```
[ ] /admin/billing muestra plan, trial, historial
[ ] Botón "Activar plan" → redirect a Mercado Pago
[ ] Webhook: subscription_authorized → store.billing_status = active
[ ] Webhook: payment_approved → registro en billing_payments
[ ] Webhook: payment_failed → store.billing_status = past_due (si corresponde)
[ ] Cron: check_trial_expiry → tiendas demo vencidas → past_due
[ ] Cron: archive_inactive_stores → past_due +30 días → archived
[ ] /superadmin: dashboard con MRR y tiendas activas
[ ] /superadmin/stores: lista con filtros
```

### Fase 4 — Módulos

```
[ ] create_order handler registrado
[ ] /admin/pedidos: lista, filtros, detalle
[ ] Stepper de estados de pedido funciona
[ ] update_stock handler registrado
[ ] /admin/stock: lista con indicadores semánticos
[ ] create_order descuenta stock automáticamente si módulo activo
[ ] stock_depleted emite evento cuando llega a 0
```

### Fase 5 — Performance

```
[ ] Redis conectado (getOrSet funciona)
[ ] Cache aplicado en queries de vitrina pública
[ ] invalidateCache ejecuta en el executor después de mutaciones
[ ] Rate limiting activo en middleware (100 req/min)
[ ] npm run build: bundle size analizado
[ ] No hay queries N+1 identificadas sin resolver
```

### Fase 6 — IA

```
[ ] /api/assistant responde en < 10s
[ ] Límite de tokens se verifica antes de llamar a OpenAI
[ ] ai_tokens_used se actualiza en stores después de cada mensaje
[ ] Historial de sesión carga correctamente
[ ] ActionProposal muestra confirmación antes de ejecutar
[ ] Actions confirmadas pasan por el executor con actor.type='ai'
[ ] /admin/asistente: chat funcional end-to-end
```
