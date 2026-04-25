# START — Centro de Operaciones

Este archivo es el punto de entrada obligatorio para cualquier agente IA que trabaje en este proyecto. Leé este archivo completo antes de tocar una sola línea de código.

## Jerarquía de Verdad

Ante conflicto entre documentos, la prioridad es:

1. `system/` (especificación canónica)
2. `PLAN.md` (orden de ejecución)
3. `ESTADO.md` (estado actual)
4. `FLUJO.md` (historias de usuario y decisiones de producto UX; no contradice `system/`)
5. Todo lo demás

## Estado del Proyecto (2026-04-24)

F0–F14 completadas. F15 en progreso (35% — Bloque 0.7 y P2.1–2.4 listos). SQL migration 13.0 ejecutada. Env vars de producción configuradas. Deploy activo en Vercel.

**Fase en curso: F15 — Design Excellence.** Completar Bloques 0–9 antes de iniciar F16.

**Próximas fases planificadas (F16–F22):**

| Fase | Nombre | Prioridad |
|------|--------|-----------|
| F16 | Admin Ventas (POS) | 🔴 Crítica |
| F17 | Onboarding Magic 2.0 + Billing en Onboarding | 🔴 Crítica |
| F18 | Bugs Críticos de Auditoría | 🔴 Crítica |
| F19 | Catálogo Público: Checkout Mejorado + Performance | 🟠 Alta |
| F20 | SEO + OpenGraph por Tienda | 🟠 Alta |
| F21 | Custom Domain Base + Middleware | 🟠 Alta |
| F22 | Email Mejorado + Notificaciones | 🟡 Media |

---

## Protocolo de Inicio de Sesión

1. Leer `ESTADO.md` → identificar fase actual, paso actual, blockers
2. Leer el paso correspondiente en `PLAN.md`
3. Leer los archivos de `system/` que el paso referencia
4. Implementar exactamente lo que el paso indica
5. No avanzar al siguiente paso sin cumplir criterios de aceptación

En el paso **0.4** (`PLAN.md`), ejecutar `schema.sql` completo en el SQL Editor de Supabase y verificar 30 tablas + RLS antes de **0.5** (generar tipos). Si el SQL falla, no avanzar hasta corregirlo.

## Protocolo de Fin de Sesión

1. Verificar `pnpm build` y `pnpm exec tsc --noEmit` sin errores
2. Actualizar `ESTADO.md`:
   - Marcar pasos completados con [x]
   - Registrar decisiones tomadas
   - Registrar blockers encontrados
   - Indicar qué sigue exactamente

---

## Reglas Innegociables

- **Runtime**: Node 22 + pnpm. Nunca npm ni yarn.
- **Tailwind**: v3 obligatorio. Fijar `"tailwindcss": "^3"` en package.json; no aceptar v4.
- **Subdominios**: en prod las rutas públicas se resuelven por subdominio `{slug}.kitdigital.ar` (Host header). En dev (`NODE_ENV=development`) se usa fallback path-based `localhost:3000/{slug}/*`. El middleware detecta el entorno y elige la estrategia.
- `/system` es la fuente de verdad. Si algo no está ahí, no existe.
- Toda escritura de dominio pasa por el executor.
- `store_id` se resuelve en servidor, nunca del cliente.
- Sin `any` en TypeScript.
- Toda entidad de dominio tiene `store_id`.
- Toda query filtra por `store_id`.
- La IA no ejecuta acciones directamente; pasa por el executor.
- Un módulo solo escribe en sus propias tablas.
- Los eventos son inmutables.
- Mobile-first siempre.
- **Billing dual**: `stores.billing_period = 'monthly' | 'annual'`. El plan anual incluye todos los módulos pro EXCEPTO `assistant`. `assistant` es siempre add-on mensual independientemente del billing_period. Ver `system/billing.md`.
- **Grupos de módulos**: toda UI que liste módulos debe usar los grupos definidos en `system/modules.md §"Grupos de Módulos"`.
- **Cap de tiendas**: `plans.max_stores_total` controla el límite global. `create_store` debe validarlo. `NULL` = sin límite.

---

## Decisiones de Producto (Aprobadas 2026-04-24)

Estas decisiones modifican comportamientos anteriores. Tienen precedencia sobre documentación previa.

### DP-01 — Sin trial automático; sin “modo demo” en el camino del dueño

El onboarding termina con **pago obligatorio** (Mercado Pago) antes de acceder al panel. El trial (`plans.trial_days`) queda **en stand-by** para uso manual del superadmin (regalo, promoción). **No hay trial por defecto para nuevos usuarios.**

- **Flujo canónico:** pasos 1–3 (tienda, diseño, módulos) → paso 4 (pago) → webhook MP confirma → `billing_status = 'active'` → el dueño entra al **admin con catálogo operativo**. No existe para el usuario una fase “ya estoy en el admin pero en demo”.
- **Valor `demo` en BD:** puede seguir existiendo en el esquema por compatibilidad o casos excepcionales (superadmin, datos legacy); **no es el modelo del onboarding 2026**. La UX no debe exponer “modo demo”.
- **Sin pago completado:** no hay acceso a `/admin` (middleware redirige al onboarding, típicamente paso de pago o pantalla de retoma). No se muestra un admin completo con todo bloqueado.
- **Executor:** solo acepta escrituras de dominio cuando `billing_status` permite operar la tienda (`active`, y según reglas `past_due` lectura, etc.); ver `FLUJO.md` y código vigente.

### DP-02 — Onboarding "Mágico" (Apple-style)

El onboarding debe rediseñarse completamente con los siguientes criterios:

1. **Flujo**: Info tienda → Diseño (logo + color) → Módulos → Pago → Éxito
2. **Pago en onboarding**: paso 4 usa MP Checkout Preference (mismo mecanismo que billing manual). Al confirmar pago, webhook activa la tienda y el usuario continúa.
3. **Pantalla final**: "Enviamos un mail a `{email}`. Confirmá tu cuenta y entrá al panel." Con link para reenviar.
4. **Email confirmation**: habilitar en Supabase Auth antes de lanzar.
5. **Animaciones**: transiciones suaves entre pasos. Micro-animaciones en cada CTA. Sensación de progreso constante.
6. **Sin fricción**: cada paso tiene un solo objetivo. Sin forms largos. Autoguardado.

### DP-03 — Sección "Ventas" en Admin (POS/Caja) — alineado a `/design/admin`

Hay una sección `/admin/ventas` (POS) como en el preview de diseño: caja → confirmar venta → los datos quedan en **Pedidos** (`orders` + `order_items` + estado coherente). **No hay página de menú “Pagos”** como módulo aparte: lo que existe es **configuración de métodos de cobro al cliente** (en principio **Mercado Pago** y **transferencia**; el POS también puede registrar efectivo, etc.) y el registro del cobro va ligado al pedido/venta.

- Buscar productos por nombre o escanear (futuro).
- Agregar items con cantidad.
- Seleccionar cliente (existente o rápido nombre+teléfono).
- Elegir método de cobro según lo configurado (efectivo / transferencia / link MP / cuenta de ahorro si aplica).
- Registrar descuento opcional.
- Confirmar venta → crea `order` + `order_items` + registro de cobro asociado + descuenta `stock` si aplica + movimientos en **Finanzas** / cuenta de ahorro si módulos activos.
- Opcionalmente enviar comprobante por WhatsApp al cliente.

**El carrito público (catálogo) solo abre WhatsApp. No registra pedidos en DB** (salvo futuro checkout MP automático cuando esté implementado).

La excepción futura: checkout del catálogo con MP cuando el dueño tenga habilitado “pago con Mercado Pago” en la configuración de métodos → pedido `source='mp_checkout'`.

### DP-04 — Custom Domain es feature BASE (no pro)

El módulo `custom_domain` pasa de `pro` a `base`. Todos los planes lo incluyen sin costo adicional. El middleware debe:

1. Si el Host termina en `.kitdigital.ar` → resolver por slug (comportamiento actual).
2. Si el Host NO termina en `.kitdigital.ar` → buscar en `stores.custom_domain` donde `custom_domain_verified = true`. Cachear en Redis 5 minutos por Host.

Impacto en billing: `custom_domain` se elimina de la lista de módulos pro que se cobran.

### DP-05 — AI Tokens: Límite Mensual

El módulo `assistant` tiene límite mensual (no por sesión, no diario).

- `plans.ai_tokens_monthly` (nueva columna) — default 50000 tokens/mes.
- `stores.ai_tokens_used` ya existe (reset mensual vía cron).
- `stores.ai_tokens_reset_at` (nueva columna) — timestamp del último reset.
- El handler `execute_assistant_action` valida `ai_tokens_used < ai_tokens_monthly` ANTES de llamar a OpenAI.
- Si el límite se alcanza → error `LIMIT_EXCEEDED` con mensaje claro al usuario.
- Cron mensual (día 1 de cada mes): resetea `ai_tokens_used = 0` y actualiza `ai_tokens_reset_at`.
- Futura mejora (documentada, no implementar ahora): límites diario y semanal.

### DP-06 — WhatsApp Checkout Mejorado (Catálogo Público)

El cart drawer muestra un formulario antes de abrir WhatsApp:

- **Nombre** (obligatorio).
- **Tipo de entrega**: "Retiro en local" o "Envío a domicilio" (si módulo shipping activo).
- **Dirección** (aparece solo si eligió envío, opcional).
- **Método de pago preferido** (si hay métodos configurados en ajustes — p. ej. MP, transferencia): lista + "Efectivo al entregar".
- **Nota** (opcional).
- Botón "Enviar pedido" → genera mensaje WA enriquecido con todos los datos → abre `wa.me/...`.

Este formulario es 100% client-side (Zustand). No persiste nada en DB desde el catálogo público.

---

## Cómo Agregar una Feature Nueva

1. Definir en `system/modules.md` si es un módulo nuevo (acciones, límites, dependencias)
2. Agregar tablas necesarias en `schema.sql`
3. Registrar handler en el executor
4. Crear server actions que invocan el executor
5. Crear hooks de TanStack Query
6. Crear componentes UI
7. Agregar invalidaciones en `system/realtime.md`
8. Actualizar `ESTADO.md`

---

## Estrategia de Testing

**Framework:** Vitest.

| Qué testear | Tipo | Cuándo | Prioridad |
|-------------|------|--------|-----------|
| Executor: pipeline completo | Unitario | F0.6 | Alta |
| RLS: aislamiento multitenant | Integración | F0.4 | Alta |
| Webhooks MP: firma HMAC, idempotencia | Integración | F5 | Alta |
| Server actions: validación de input | Unitario | Incremental | Media |
| Zod schemas: edge cases | Unitario | Incremental | Media |

---

## SQL Migrations Acumuladas (pendientes de ejecutar)

Ejecutar **en orden** en Supabase SQL Editor. Algunas ya están en el schema.sql master; estas son las que deben aplicarse a la DB de producción existente.

```sql
-- ====== YA EJECUTADAS (F13) ======
-- ALTER TABLE stores ADD COLUMN billing_period TEXT...
-- ALTER TABLE stores ADD COLUMN annual_paid_until DATE;
-- ALTER TABLE plans ADD COLUMN annual_discount_months INTEGER...
-- ALTER TABLE plans ADD COLUMN max_stores_total INTEGER;
-- ALTER TABLE billing_payments ALTER COLUMN mp_subscription_id DROP NOT NULL;

-- ====== PENDIENTES F15 ======
ALTER TABLE products ADD COLUMN compare_price INTEGER;
ALTER TABLE products ADD COLUMN stock INTEGER;

-- ====== PENDIENTES F16 (Ventas/POS) ======
ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'admin'
  CHECK (source IN ('admin', 'whatsapp', 'mp_checkout'));

-- ====== PENDIENTES F18 (AI Tokens) ======
ALTER TABLE plans ADD COLUMN ai_tokens_monthly INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE stores ADD COLUMN ai_tokens_reset_at TIMESTAMPTZ DEFAULT NOW();

-- ====== PENDIENTES F23 (DB Fixes) ======
-- FKs faltantes
ALTER TABLE variants ADD CONSTRAINT variants_store_fk
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE variant_attributes ADD CONSTRAINT variant_attributes_store_fk
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE variant_values ADD CONSTRAINT variant_values_store_fk
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE stock_items ADD CONSTRAINT stock_items_store_fk
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE wholesale_prices ADD CONSTRAINT wholesale_prices_store_fk
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

-- Constraints de calidad
ALTER TABLE products ADD CONSTRAINT products_stock_nonneg
  CHECK (stock IS NULL OR stock >= 0);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_products_store_out_of_stock ON products(store_id) WHERE stock = 0;
CREATE INDEX IF NOT EXISTS idx_events_store_type_created ON events(store_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_source ON orders(store_id, source);
```

---

## Plantillas de Código

### Server Action

```typescript
'use server'

import { executor } from '@/lib/executor'
import { getStoreContext } from '@/lib/auth/store-context'
import { createActionSchema } from '@/lib/validations/schemas'

export async function createEntity(input: unknown) {
  const context = await getStoreContext()
  const validated = createActionSchema.parse(input)

  return executor({
    name: 'create_entity',
    store_id: context.store_id,
    actor: { type: 'user', id: context.user_id },
    input: validated,
  })
}
```

### Query Hook (TanStack)

```typescript
import { useQuery } from '@tanstack/react-query'
import { getEntities } from '@/lib/db/queries'
import { useStoreContext } from '@/lib/hooks/use-store-context'

export function useEntities(filters?: Filters) {
  const { store_id } = useStoreContext()

  return useQuery({
    queryKey: ['entities', store_id, filters],
    queryFn: () => getEntities(store_id, filters),
  })
}
```

### Mutation Hook con Invalidación

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntity } from '@/app/actions/entity'
import { useStoreContext } from '@/lib/hooks/use-store-context'
import { toast } from 'sonner'

export function useCreateEntity() {
  const queryClient = useQueryClient()
  const { store_id } = useStoreContext()

  return useMutation({
    mutationFn: createEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', store_id] })
      toast.success('Creado correctamente')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
```

### Componente Admin

```typescript
'use client'

import { useEntities } from '@/lib/hooks/use-entities'
import { DataTable } from '@/components/ui/data-table'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'

export function EntityList() {
  const { data, isLoading, error } = useEntities()

  if (isLoading) return <Skeleton className="h-96" />
  if (error) return <ErrorState error={error} />
  if (!data?.length) return <EmptyState entity="entities" />

  return <DataTable columns={columns} data={data} />
}
```

### Webhook Handler

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/billing/verify-signature'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  // Process webhook...

  return NextResponse.json({ received: true }, { status: 200 })
}
```
