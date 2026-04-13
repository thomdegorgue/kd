# Executor — Motor Central del Sistema

El executor es la función centralizada que ejecuta toda operación de negocio. Todo request (de usuario, IA o sistema) pasa por este pipeline sin excepción.

---

## Firma

```typescript
async function executor(params: {
  name:     string
  store_id: string | null
  actor:    { type: ActorType; id: string | null }
  input:    object
}): Promise<ActionResult>
```

## Retorno

```typescript
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string; field?: string } }
```

---

## Pipeline de Ejecución (10 pasos)

```
1. Resolver action handler (del registry)
2. Validar store_id + estado de tienda
3. Validar actor y permisos
4. Validar módulos requeridos activos
5. Validar límites del plan
6. Validar input de negocio (Zod + reglas del módulo)
7. Ejecutar lógica del módulo (dentro de transacción)
8. Emitir evento (dentro de la misma transacción)
9. Invalidar caché afectado (async, post-commit)
10. Devolver resultado
```

Si cualquier paso falla, se retorna el error y no se avanza.

---

## Detalle de Cada Paso

### Paso 1 — Resolver handler
Busca en el registry el handler para `name`. Si no existe → `SYSTEM_ERROR`.

### Paso 2 — Validar tienda
- Verificar que `store_id` no es null (salvo operaciones globales de superadmin)
- Cargar tienda desde DB o StoreContext
- Verificar que existe → `NOT_FOUND`
- Verificar que el status permite la operación:

| Status | Permitido |
|--------|----------|
| `demo` | CORE + módulos base |
| `active` | Todo |
| `past_due` | Solo lecturas (GET, LIST) |
| `suspended` | Nada → `STORE_INACTIVE` |
| `archived` | Nada → `STORE_INACTIVE` |

### Paso 3 — Validar actor y permisos
- Verificar que el actor está autenticado según su tipo
- Verificar que tiene el rol requerido en `permissions` del handler
- Para `user`: verificar en `store_users` que tiene rol permitido
- Si no tiene permiso → `UNAUTHORIZED`

### Paso 4 — Validar módulos
- Para cada módulo en `handler.requires`: verificar `store.modules[modulo] === true`
- Si alguno inactivo → `MODULE_INACTIVE`
- Actions CORE tienen `requires: []` y pasan sin verificación

### Paso 5 — Validar límites
Solo aplica si el handler declara un límite a verificar (`max_products`, `max_orders`, `ai_tokens`).
- Contar entidades actuales con scope de tienda
- Si `current >= limit` → `LIMIT_EXCEEDED`

### Paso 6 — Validar input de negocio
El handler ejecuta sus validaciones específicas:
- Referencias a otras entidades existen y pertenecen a la misma tienda
- Valores en rangos válidos
- Estados consistentes con la operación
- Error → código apropiado (`NOT_FOUND`, `CONFLICT`, `INVALID_INPUT`)

### Paso 7 — Ejecutar lógica (transacción)
- BEGIN TRANSACTION
- Handler ejecuta writes en sus tablas
- Si necesita datos de otro módulo, los lee dentro de la transacción
- Si necesita invocar action de otro módulo: llamada recursiva al executor con misma transacción (omite pasos 2-4 ya validados)
- Si falla → ROLLBACK

### Paso 8 — Emitir evento (misma transacción)

**IMPORTANTE:** El executor SIEMPRE usa `supabaseServiceRole` para insertar eventos. Nunca el cliente autenticado del usuario. Esto garantiza que:
- Eventos con `store_id = NULL` (sistema, superadmin global) se inserten sin conflicto con RLS.
- La política `events_insert` en RLS no bloquee inserciones legítimas del executor.

```sql
INSERT INTO events (store_id, type, actor_type, actor_id, data)
VALUES ($1, $2, $3, $4, $5)
```
Si falla el insert del evento → ROLLBACK completo.
COMMIT solo si todo ok.

### Paso 9 — Invalidar caché (post-commit)
Cada handler declara qué cache keys invalida:
```typescript
invalidates: ['store:{store_id}:products:public', 'store:{store_id}:categories']
```
Invalidación async (fire and forget). Si falla, los datos se refrescan al expirar el TTL.

### Paso 10 — Retornar resultado
```typescript
return { success: true, data: handler.output }
```

---

## Registro de Handlers

Cada handler se registra en `src/lib/executor/registry.ts`:

```typescript
type ActionHandler = {
  name:        string
  requires:    ModuleName[]
  permissions: (StoreUserRole | 'superadmin' | 'system' | 'ai')[]
  limits?:     { field: string; countQuery: (storeId: string) => Promise<number> }
  event_type:  string | null
  invalidates: string[]
  validate:    (input: unknown, context: StoreContext) => ValidationResult
  execute:     (input: unknown, context: StoreContext, db: Transaction) => Promise<unknown>
}
```

**El registry es la única fuente de verdad en código** para el mapa action → módulo → permisos → límites. Si una action no está registrada en el registry, el executor la rechaza con `SYSTEM_ERROR` en el paso 1. `system/modules.md` es la referencia humana de diseño; el registry es la referencia ejecutable. Ambos deben estar siempre alineados.

---

## Superadmin

El superadmin bypasea pasos 2d (estado de tienda) y 3b (permisos de rol por tienda).
No bypasea: validación de datos (paso 6-7), emisión de evento (paso 8). Siempre deja traza con `actor_type: 'superadmin'`.

## Actor IA

El actor `ai` usa exactamente el mismo pipeline. No tiene modo especial. La única diferencia: `actor_type` se registra como `'ai'` en el evento, y se verifica que la action esté habilitada para IA.
