# Execution Model — KitDigital.AR

## Propósito

Este archivo define el motor del sistema: el pipeline exacto que ejecuta toda action.

Es la referencia operativa para implementar el executor. Todo request de negocio — de usuario, de la IA, o del sistema — pasa por este pipeline sin excepción.

→ Contrato de actions: `/system/core/action-contract.md`
→ Reglas de backend: `/system/backend/backend-rules.md`
→ Cómo la IA usa este pipeline: `/system/ai/execution.md`

---

## El Executor

El executor es una función centralizada que recibe una action y ejecuta el pipeline completo.

**Firma:**

```typescript
async function executor(params: {
  name:     string        // nombre canónico de la action
  store_id: string | null // null solo para acciones globales de superadmin
  actor: {
    type: 'user' | 'superadmin' | 'system' | 'ai'
    id:   string | null
  }
  input:    object        // datos de la action, ya validados en formato por el endpoint
}): Promise<ActionResult>
```

**Retorno:**

```typescript
type ActionResult =
  | { success: true;  data: object }
  | { success: false; error: { code: string; message: string; field?: string } }
```

---

## Pipeline de Ejecución

El executor aplica los pasos en este orden exacto. Si algún paso falla, devuelve el error y no avanza.

```
┌─────────────────────────────────────────────────────┐
│  PASO 1 — Resolver action handler                   │
├─────────────────────────────────────────────────────┤
│  PASO 2 — Validar store_id y estado de tienda       │
├─────────────────────────────────────────────────────┤
│  PASO 3 — Validar actor y permisos                  │
├─────────────────────────────────────────────────────┤
│  PASO 4 — Validar módulos requeridos activos        │
├─────────────────────────────────────────────────────┤
│  PASO 5 — Validar límites del plan                  │
├─────────────────────────────────────────────────────┤
│  PASO 6 — Validar input de negocio                  │
├─────────────────────────────────────────────────────┤
│  PASO 7 — Ejecutar lógica del módulo (transacción)  │
├─────────────────────────────────────────────────────┤
│  PASO 8 — Emitir evento (dentro de la transacción)  │
├─────────────────────────────────────────────────────┤
│  PASO 9 — Invalidar cache afectado                  │
├─────────────────────────────────────────────────────┤
│  PASO 10 — Devolver resultado                       │
└─────────────────────────────────────────────────────┘
```

---

## Detalle de Cada Paso

### PASO 1 — Resolver action handler

El executor busca el handler registrado para el `name` de la action.

- Si no existe un handler registrado para ese nombre → devuelve error interno (`SYSTEM_ERROR`).
- El handler contiene: la lógica de negocio, los módulos requeridos, los permisos y el tipo de evento a emitir.
- El registro de actions es un mapa estático: `name → handler`.

---

### PASO 2 — Validar store_id y estado de tienda

**Si `store_id` es requerido (no es operación global de superadmin):**

a. Verificar que `store_id` no es null ni vacío → `INVALID_INPUT`
b. Cargar la tienda desde DB (o desde el StoreContext ya resuelto en el middleware)
c. Verificar que la tienda existe → `NOT_FOUND`
d. Verificar que el status de la tienda permite la operación:

| Status de tienda | Operaciones permitidas |
|-----------------|----------------------|
| `demo` | CORE + módulos base. Sin billing ni módulos avanzados |
| `active` | Todo |
| `past_due` | Solo lecturas (GET, LIST). No creates ni updates críticos |
| `suspended` | Ninguna (devuelve `STORE_INACTIVE`) |
| `archived` | Ninguna (devuelve `STORE_INACTIVE`) |

Si el status no permite la operación → `STORE_INACTIVE`

---

### PASO 3 — Validar actor y permisos

a. Verificar que el actor está autenticado según su tipo:
   - `user`: tiene sesión válida con `user_id`
   - `superadmin`: tiene sesión válida con rol `superadmin`
   - `system`: tiene service role o API key interna válida
   - `ai`: el request viene del executor de IA con token interno válido

b. Verificar que el actor tiene el rol requerido en `permissions` del handler:
   - Para `user`: verificar que `store_users` tiene un registro para `(store_id, user_id)` con un rol incluido en `permissions`
   - Para `superadmin`: siempre permitido si el handler incluye `superadmin` en `permissions`
   - Para `system`: permitido si `system` está en `permissions`
   - Para `ai`: permitido si `ai` está en `permissions` (verificado también en `/system/ai/actions.md`)

Si el actor no tiene permiso → `UNAUTHORIZED`

---

### PASO 4 — Validar módulos requeridos activos

a. Leer `store.modules` del StoreContext (o de la tienda cargada en Paso 2)
b. Para cada módulo en `handler.requires`:
   ```
   if (!store.modules[module_name]) → MODULE_INACTIVE
   ```
c. Si todos los módulos están activos → continuar
d. Si alguno está inactivo → `MODULE_INACTIVE` con el nombre del módulo en el mensaje

Las actions del CORE tienen `requires: []` y pasan este paso sin verificaciones.

---

### PASO 5 — Validar límites del plan

Este paso solo aplica a actions que pueden exceder un límite. Cada handler declara qué límite verifica (si alguno).

**Verificaciones disponibles:**

| Límite | Cuándo se verifica |
|--------|-------------------|
| `max_products` | En `create_product`, solo si `is_active: true` |
| `max_orders` | En `create_order`, contando pedidos del mes actual |
| `ai_tokens` | En `send_assistant_message`, verificando tokens consumidos en el período |

Lógica de verificación:

```
current_count = COUNT de la entidad con store_id = context.store_id [+ filtros del período]
limit = store.limits[limit_name]
if (current_count >= limit) → LIMIT_EXCEEDED
```

Si el handler no declara límite a verificar, este paso se omite.

---

### PASO 6 — Validar input de negocio

El handler ejecuta sus validaciones de negocio propias sobre el `input`:

- Referencias a otras entidades existen y pertenecen a la misma tienda (`NOT_FOUND`)
- Valores en rangos válidos (`INVALID_INPUT`)
- Estados consistentes con la operación (`CONFLICT`)
- Cualquier otra regla de negocio del módulo

Este paso es el único que contiene lógica específica del módulo dentro del executor.
Si una validación falla → error con código apropiado del contrato.

---

### PASO 7 — Ejecutar lógica del módulo (dentro de transacción)

Se abre una transacción de Postgres. Dentro de ella:

a. El handler ejecuta el/los writes sobre las tablas de su dominio.
b. Si necesita leer datos de otro módulo (External reads declarados), lo hace dentro de la misma transacción.
c. Si la lógica requiere invocar una action pública de otro módulo (ej: `process_stock_deduction` desde orders), se llama recursivamente al executor con el mismo contexto de transacción.
d. Si cualquier write falla → ROLLBACK y error.

---

### PASO 8 — Emitir evento (dentro de la misma transacción)

Al final del write, y todavía dentro de la transacción del Paso 7:

```sql
INSERT INTO events (store_id, type, actor_type, actor_id, data)
VALUES (context.store_id, handler.event_type, actor.type, actor.id, event_payload)
```

El `event_payload` se construye según el contrato del evento correspondiente en `/system/core/events.md`.

Si el INSERT del evento falla → ROLLBACK completo (la operación de negocio también se revierte).

Una vez que la transacción hace COMMIT, el evento está persistido de forma permanente.

---

### PASO 9 — Invalidar cache

Después del COMMIT, el executor invalida las keys de Redis afectadas por la operación.

Cada handler declara qué cache keys invalida:

```typescript
invalidates: [
  'store:{store_id}:products:public',
  'store:{store_id}:categories',
]
```

La invalidación es asíncrona (fire and forget). Si falla, el próximo request encontrará datos desactualizados temporalmente hasta el siguiente TTL del cache.

---

### PASO 10 — Devolver resultado

```typescript
return {
  success: true,
  data: handler.output  // entidad resultante según contrato de la action
}
```

Si cualquier paso previo falló, ya se devolvió el error correspondiente. Este paso solo se alcanza si todo fue exitoso.

---

## Registro de Handlers

Cada módulo registra sus handlers en el executor. Un handler tiene esta estructura:

```typescript
type ActionHandler = {
  name:        string          // nombre canónico de la action
  requires:    string[]        // módulos requeridos activos
  permissions: ActorType[]     // actores permitidos
  limits?:     LimitCheck      // límite a verificar (opcional)
  event_type:  string | null   // tipo de evento a emitir (null si no emite)
  invalidates: string[]        // cache keys a invalidar
  validate:    (input, context) => ValidationResult   // validaciones de negocio (Paso 6)
  execute:     (input, context, db) => Promise<object> // lógica del módulo (Paso 7)
}
```

Todos los handlers se registran en un mapa central en `/lib/executor/registry.ts`.

---

## Actions Recursivas

Cuando el handler de una action necesita ejecutar una action de otro módulo (boundary vía action pública), usa una versión interna del executor que:

1. Comparte la misma transacción de DB
2. Usa el mismo StoreContext
3. **Omite los pasos 2, 3, y 4** (ya validados por la action padre)
4. **Ejecuta los pasos 5, 6, 7 y 8** del handler hijo

El evento del handler hijo también se emite dentro de la misma transacción.

---

## Comportamiento con Superadmin

El superadmin bypasea los pasos 2d (estado de tienda) y 3b (permisos de rol por tienda), pero NO bypasea:

- Paso 2a/b/c (store_id válido si aplica)
- Paso 7 (lógica del módulo — la data debe ser válida)
- Paso 8 (evento siempre se emite, con `actor_type: "superadmin"`)

El superadmin siempre deja traza en el sistema de eventos.

---

## Comportamiento con Actor `ai`

El actor `ai` usa exactamente el mismo pipeline. El executor no tiene modo especial para IA.

La única diferencia es:
- El `actor_type` se registra como `"ai"` en el evento
- El Paso 3 verifica que la action está habilitada para `ai` en `/system/ai/actions.md`

→ Ver flujo completo de ejecución de IA: `/system/ai/execution.md`

---

## Diagrama de Flujo Completo

```
REQUEST
  │
  ▼
Middleware (auth + store resolution + StoreContext)
  │
  ▼
API Route / Server Action (validación de formato con Zod)
  │
  ▼
executor({ name, store_id, actor, input })
  │
  ├─[1] ¿Handler existe? ─── NO ──→ SYSTEM_ERROR
  │        YES
  ├─[2] ¿store_id válido + status permite? ─── NO ──→ NOT_FOUND / STORE_INACTIVE
  │        YES
  ├─[3] ¿Actor tiene permiso? ─── NO ──→ UNAUTHORIZED
  │        YES
  ├─[4] ¿Módulos requeridos activos? ─── NO ──→ MODULE_INACTIVE
  │        YES
  ├─[5] ¿Límites del plan OK? ─── NO ──→ LIMIT_EXCEEDED
  │        YES
  ├─[6] ¿Input de negocio válido? ─── NO ──→ NOT_FOUND / CONFLICT / INVALID_INPUT
  │        YES
  ├─[7] BEGIN TRANSACTION → execute handler
  │        │
  ├─[8]    └─ INSERT event (mismo transaction)
  │        │
  │      COMMIT (si ok) / ROLLBACK (si falla) ─── FALLO ──→ SYSTEM_ERROR
  │
  ├─[9] Invalidar cache (async)
  │
  ├─[10] return { success: true, data: ... }
  │
  ▼
API Route serializa → HTTP Response
```
