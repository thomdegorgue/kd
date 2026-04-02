# Backend Rules — KitDigital.AR

## Propósito

Este archivo define los principios y reglas que rigen toda la capa de backend del sistema.

No define la lógica de negocio de módulos específicos (eso está en cada módulo).
Define cómo se estructura, organiza y ejecuta la capa de servidor en su totalidad.

→ Pipeline de ejecución detallado: `/system/backend/execution-model.md`
→ Reglas globales del sistema: `/system/constraints/global-rules.md`
→ Contrato de actions: `/system/core/action-contract.md`

---

## Tecnología Base

El backend está implementado sobre:

- **Next.js 15 App Router** — API routes en `/app/api/` y Server Actions
- **Supabase** — PostgreSQL como base de datos, Auth para autenticación, RLS para seguridad a nivel de fila
- **Supabase Edge Functions** — para operaciones background, cron jobs y webhooks
- **Upstash Redis** — cache de respuestas frecuentes y rate limiting

---

## Regla 1 — Todo pasa por el executor

**Ninguna operación de negocio se ejecuta directamente desde una API route o Server Action.**

Toda action pasa por el executor centralizado, que aplica el pipeline completo de validaciones antes de ejecutar.

Las API routes y Server Actions son solo la capa de entrada: autentican, extraen el `store_id`, y delegan al executor.

```
API Route / Server Action
    → extrae store_id + actor
    → llama executor({ name, store_id, actor, input })
    → devuelve el resultado
```

Sin excepciones. Ni para "operaciones simples". Ni para el superadmin.

→ Ver pipeline: `/system/backend/execution-model.md`

---

## Regla 2 — Toda query incluye store_id

**Ninguna query sobre tablas de dominio se ejecuta sin filtro `store_id = currentStoreId`.**

El `currentStoreId` se resuelve en el middleware de resolución de tienda, antes de cualquier handler.
Nunca viene del cliente como parámetro de confianza para operaciones que implican datos de la tienda.

```typescript
// CORRECTO
const products = await db
  .from('products')
  .select('*')
  .eq('store_id', context.store_id)
  .eq('is_active', true)

// INCORRECTO — nunca hacer esto
const products = await db
  .from('products')
  .select('*')
  // sin store_id = cualquier producto de cualquier tienda
```

RLS de Supabase es la segunda línea de defensa, no la única.

---

## Regla 3 — No hay lógica de negocio duplicada

**Cada regla de negocio existe en un solo lugar.**

- Las validaciones de módulo están en el executor, no en cada módulo.
- Las validaciones de límites están en el executor, no en cada módulo.
- La lógica específica de un módulo está en el handler de ese módulo, no replicada en otros.
- Las transformaciones de datos se hacen en un solo lugar; no hay dos funciones que hagan lo mismo.

Si al implementar algo se detecta que existe lógica similar en otro lugar, se extrae a una función compartida en la capa de utilidades. No se copia.

---

## Regla 4 — Las acciones son la interfaz pública de los módulos

**Los módulos exponen actions. El resto del sistema los invoca por nombre, no llama a sus funciones internas directamente.**

```typescript
// CORRECTO — invocar via executor
await executor({ name: 'create_order', store_id, actor, input })

// INCORRECTO — llamar directamente
import { createOrderInternal } from '@/modules/orders'
await createOrderInternal(data)
```

La única excepción son las lecturas directas controladas entre módulos, declaradas en `External reads` de cada módulo.

---

## Regla 5 — Los endpoints son thin controllers

**Las API routes y Server Actions no contienen lógica de negocio.**

Solo hacen:
1. Extraer y validar el formato básico del request (tipos, presencia de campos obligatorios de transporte)
2. Resolver el contexto de tienda y actor
3. Invocar el executor con los parámetros correctos
4. Serializar y devolver la respuesta

Todo lo demás (validaciones de negocio, límites, módulos, permisos) es responsabilidad del executor.

---

## Regla 6 — Autenticación y resolución de contexto primero

**Antes de cualquier operación, el middleware resuelve:**

1. **Autenticación:** quién es el usuario (JWT de Supabase Auth). Si no está autenticado y la ruta lo requiere, devuelve 401.
2. **Resolución de tienda:** a qué tienda pertenece el request (subdominio, dominio custom, sesión). Si no se puede resolver, devuelve 404.
3. **Construcción del contexto:** `StoreContext { store_id, slug, status, modules, limits, billing }`. Este contexto se construye una sola vez por request y se reutiliza.
4. **Estado de la tienda:** si el status bloquea la operación (suspended, archived), devuelve la respuesta apropiada antes de llegar al executor.

---

## Regla 7 — Rate limiting en operaciones críticas

**Las siguientes operaciones tienen rate limiting via Upstash Redis:**

| Operación | Límite |
|-----------|--------|
| Cualquier API route autenticada | 100 req/min por `(user_id, store_id)` |
| `generate_whatsapp_message` (público) | 30 req/min por IP |
| Invocación de IA | 20 req/min por `store_id` |
| Webhook handlers | 10 req/seg por IP de proveedor |
| Login / Auth | 10 intentos/15min por IP |

Si se supera el límite, se devuelve `429 Too Many Requests` con el header `Retry-After`.

---

## Regla 8 — Manejo de errores consistente

**Todo error del backend sigue el formato del contrato de actions.**

```json
{
  "success": false,
  "error": {
    "code": "MODULE_INACTIVE",
    "message": "El módulo 'orders' no está activo para esta tienda.",
    "field": null
  }
}
```

- Los errores de validación de input incluyen el `field` afectado.
- Los errores internos devuelven `SYSTEM_ERROR` sin exponer detalles internos al cliente.
- Los errores se loguean en el servidor con el contexto completo (store_id, actor, action, stack).
- Nunca se expone un stack trace en la respuesta al cliente.

---

## Regla 9 — Cache estratégico, no indiscriminado

**El cache con Redis se aplica solo a datos que:**
- Son costosos de calcular o requieren múltiples joins
- Cambian infrecuentemente (config de tienda, lista de categorías públicas)
- Son accedidos con alta frecuencia (vitrina pública)

**Se invalida el cache cuando se ejecuta una action que modifica los datos cacheados.**

Keys de cache con scope de tienda:

```
store:{store_id}:config          — config pública de la tienda
store:{store_id}:categories      — categorías activas
store:{store_id}:products:public — productos activos para la vitrina
store:{store_id}:modules         — módulos activos (incluido en StoreContext)
```

El cache del panel de gestión es manejado por TanStack Query en el cliente.

---

## Regla 10 — Las operaciones background son controladas

**Los cron jobs y procesos en background:**

- Se ejecutan como Supabase Edge Functions con schedule
- Actúan con `actor_type: system`
- Se loguean como eventos con `actor_type: "system"`
- No tienen acceso a la sesión de ningún usuario
- Operan sobre múltiples tiendas pero siempre con scope explícito

**Cron jobs definidos:**

| Job | Frecuencia | Acción |
|-----|-----------|--------|
| `check_trial_expiry` | Diario 00:00 UTC | Tiendas `demo` con trial vencido → `past_due` |
| `check_billing_due` | Diario 06:00 UTC | Tiendas `active` con pago vencido → `past_due` |
| `archive_inactive_stores` | Diario 12:00 UTC | Tiendas `past_due` por > 30 días → `archived` |
| `cleanup_assistant_sessions` | Diario 03:00 UTC | Eliminar `assistant_sessions` expiradas |
| `verify_custom_domains` | Cada 4 horas | Re-verificar dominios pendientes o no verificados |

---

## Regla 11 — Transacciones para operaciones compuestas

**Toda operación que implica múltiples writes y un evento se ejecuta dentro de una transacción de Postgres.**

Si cualquier parte de la transacción falla, se hace rollback completo.
El evento se emite dentro de la misma transacción: si no se puede persistir el evento, la operación no se confirma.

```
BEGIN TRANSACTION
  → write entidad principal
  → write entidades secundarias (si aplica)
  → INSERT en events
COMMIT (si todo ok) / ROLLBACK (si cualquier step falla)
```

---

## Regla 12 — Validación de input en el executor, formato en el endpoint

**Hay dos capas de validación:**

1. **Validación de formato** (en el endpoint): tipos de datos básicos, presencia de campos obligatorios de transporte. Se hace con Zod u otro esquema de validación. Si falla, devuelve 400 antes de llegar al executor.

2. **Validación de negocio** (en el executor): reglas de dominio, existencia de entidades referenciadas, límites del plan, módulos activos. Si falla, devuelve el error con código canónico del contrato.

No hay validación de negocio en los endpoints.
No hay validación de formato en el executor (asume que el input fue validado).

---

## Estructura de Carpetas del Backend

```
/app
  /api
    /stores/         → CRUD de tiendas (superadmin)
    /products/       → actions del módulo products
    /categories/     → actions del módulo categories
    /orders/         → actions del módulo orders
    /payments/       → actions del módulo payments
    /webhooks/
      /mercadopago/  → webhook de billing de KitDigital
  /actions/          → Server Actions de Next.js (panel de gestión)

/lib
  /executor/         → executor central + pipeline
  /modules/          → lógica de cada módulo
  /middleware/       → resolución de tienda, auth, rate limit
  /cache/            → helpers de Redis
  /db/               → cliente de Supabase y helpers de queries
  /events/           → helper de emisión de eventos
```

---

## Regla 13 — Sin secretos en el código

**Ningún valor sensible se hardcodea en el código.**

- API keys, tokens y credenciales viven en variables de entorno.
- Las variables de entorno requeridas están documentadas en `.env.example`.
- El código nunca loguea valores sensibles.
- Los IDs de Mercado Pago, tokens de Cloudinary y demás se leen solo desde `process.env`.
