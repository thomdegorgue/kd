# Action Contract — KitDigital.AR

## Propósito

Este archivo define el contrato universal que toda action del sistema debe cumplir.

Una **action** es la unidad atómica de comportamiento del sistema.
Toda operación con efecto de negocio — creada por un usuario, por la IA, o por el sistema — es una action.

Toda action que no cumpla este contrato es inválida y no puede ejecutarse.

→ Naming canónico de actions y tipología: `/system/core/domain-language.md`
→ Pipeline de ejecución: `/system/backend/execution-model.md`
→ Actions disponibles para IA: `/system/ai/actions.md`

---

## Estructura de una Action

Toda action tiene exactamente esta forma:

```
{
  name:      string     — nombre canónico en snake_case (ej: create_product)
  store_id:  UUID       — tienda a la que pertenece la operación
  actor:     ActorType  — quién ejecuta la action
  input:     object     — datos requeridos para ejecutar
  output:    object     — datos devueltos al completar
  errors:    ErrorType[]— errores posibles y cuándo ocurren
  requires:  string[]   — módulos que deben estar activos
  permissions: RoleType[]— roles que pueden ejecutar esta action
}
```

---

## Campos del Contrato

### `name`
- Tipo: `string`
- Obligatorio: sí
- Formato: `snake_case`, patrón `{verbo}_{entidad}` según `domain-language.md`
- Ejemplo: `create_product`, `update_order_status`, `list_products`

### `store_id`
- Tipo: `UUID`
- Obligatorio: sí, en toda action que opera sobre datos de una tienda
- Excepción: acciones de sistema global ejecutadas por `superadmin` pueden operar sin `store_id` fijo cuando actúan sobre múltiples tiendas

### `actor`
- Tipo: enum
- Valores válidos:

| Valor | Descripción |
|-------|-------------|
| `user` | Un usuario autenticado con rol en la tienda |
| `superadmin` | El operador global del sistema |
| `system` | Proceso interno (cron job, webhook handler, job en background) |
| `ai` | La IA propone la action; el executor la valida y ejecuta |

### `input`
- Tipo: `object`
- Obligatorio: sí (puede ser `{}` vacío para actions sin parámetros)
- Todos los campos del input son tipados y validados antes de ejecutar
- El input nunca incluye `store_id` como campo suelto dentro del objeto; se pasa como campo raíz del contrato
- El input nunca incluye campos que el sistema puede inferir (timestamps, IDs autogenerados)

### `output`
- Tipo: `object`
- Obligatorio: sí
- En caso de éxito devuelve el estado resultante de la entidad afectada
- Siempre incluye el `id` de la entidad creada o modificada
- Formato estándar de éxito:

```
{
  success: true,
  data: { ...entidad resultante }
}
```

### `errors`
- Tipo: array de `ErrorType`
- Obligatorio: sí — toda action declara sus errores posibles
- Formato estándar de error:

```
{
  success: false,
  error: {
    code:    string   — código de error canónico (ver tabla abajo)
    message: string   — descripción legible
    field?:  string   — campo que originó el error (si aplica)
  }
}
```

### `requires`
- Tipo: `string[]` — lista de identificadores de módulos
- Obligatorio: sí (puede ser `[]` para actions del CORE que no requieren módulos adicionales)
- Ejemplo: `["orders"]`, `["stock", "variants"]`
- El executor verifica que `store.modules[modulo] === true` para cada módulo listado antes de ejecutar

### `permissions`
- Tipo: `RoleType[]` — lista de roles autorizados
- Obligatorio: sí
- Valores: `owner`, `admin`, `collaborator`, `superadmin`, `system`, `ai`
- `ai` solo puede estar si la action es invocable por la IA según `/system/ai/actions.md`
- `system` indica que la action puede ser ejecutada por procesos internos sin actor humano

---

## Tabla de Códigos de Error Canónicos

| Código | Descripción |
|--------|-------------|
| `MODULE_INACTIVE` | El módulo requerido no está activo en la tienda |
| `LIMIT_EXCEEDED` | Se alcanzó el límite del plan para esta operación |
| `NOT_FOUND` | La entidad referenciada no existe o no pertenece a esta tienda |
| `UNAUTHORIZED` | El actor no tiene permiso para ejecutar esta action |
| `INVALID_INPUT` | El input no cumple las validaciones requeridas |
| `STORE_INACTIVE` | La tienda no está en estado `active` o no permite esta operación según su estado |
| `CONFLICT` | Estado inconsistente: la operación entra en conflicto con el estado actual |
| `EXTERNAL_ERROR` | Error de un servicio externo (Mercado Pago, Cloudinary, etc.) |
| `SYSTEM_ERROR` | Error interno no clasificado |

---

## Validaciones Obligatorias (Orden de Ejecución)

El executor aplica estas validaciones en este orden antes de ejecutar cualquier action:

1. **`store_id` presente y válido** — la tienda existe y no está `archived`
2. **Estado de tienda compatible** — según la action, verificar que el estado actual lo permite
3. **Actor autenticado y con rol válido** — el actor tiene el permiso declarado en `permissions`
4. **Módulos activos** — todos los módulos en `requires` están activos para la tienda
5. **Límites del plan** — la acción no excede los límites definidos en el plan de la tienda
6. **Input válido** — todos los campos requeridos presentes y con formato correcto

Si alguna validación falla, se devuelve el error correspondiente y la action no se ejecuta.

---

## Reglas de Inmutabilidad

- Una action ejecutada genera un evento. Ese evento es inmutable.
- Una action nunca modifica registros de otra tienda.
- Una action nunca modifica el `store_id` de una entidad existente.
- Una action nunca elimina físicamente datos sin una política explícita de hard delete definida en el módulo dueño.

---

## Actions del CORE (sin módulo requerido)

Las siguientes familias de actions no requieren módulos adicionales (`requires: []`) y pertenecen al sistema base:

- `create_store`, `update_store`, `archive_store`
- `create_user`, `update_user`
- `assign_store_user`, `update_store_user_role`, `remove_store_user`
- `get_store`, `list_stores` (superadmin)

Todo lo demás requiere al menos un módulo activo.

---

## Relación de la Action con la IA

Cuando la IA propone una action, su output tiene este formato:

```json
{
  "action": "create_product",
  "data": {
    "name": "Remera básica",
    "price": 5000,
    "description": "..."
  }
}
```

Este output es tratado como un `input` candidato para el executor.
El executor aplica todas las validaciones del contrato antes de ejecutar.
La IA **nunca** bypasea el contrato.

→ Ver flujo completo en `/system/ai/execution.md`

---

## Ejemplo Completo de Action

```
name:       create_product
store_id:   UUID de la tienda
actor:      user | ai
requires:   []   (products es parte del CORE)
permissions: [owner, admin, ai]

input:
  name:         string  — requerido, min 1 char, max 200
  price:        number  — requerido, >= 0
  description:  string  — opcional, max 2000
  category_id:  UUID    — opcional, debe pertenecer a la misma tienda
  image_url:    string  — opcional, URL válida

output (éxito):
  success: true
  data:
    id, store_id, name, price, description, category_id, image_url, created_at

errors posibles:
  LIMIT_EXCEEDED      — si store.limits.max_products fue alcanzado
  NOT_FOUND           — si category_id no existe o no pertenece a la tienda
  INVALID_INPUT       — si name o price faltan o tienen formato incorrecto
  STORE_INACTIVE      — si la tienda está en past_due, suspended o archived
  UNAUTHORIZED        — si el actor no tiene rol válido
```
