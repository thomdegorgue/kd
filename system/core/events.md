# Events Contract — KitDigital.AR

## Propósito

Este archivo es el contrato formal del sistema de eventos.

Un evento es un registro inmutable de algo que ocurrió en el sistema como consecuencia de una action ejecutada. Los eventos son el historial del sistema, la base para auditoría, debugging, webhooks futuros y analytics.

**Un evento no es una lista de nombres. Cada evento tiene contrato completo.**

→ Regla de inmutabilidad: `/system/constraints/global-rules.md` R11
→ Tabla de persistencia: `/system/database/schema.md`
→ Naming de eventos: `/system/core/domain-language.md`

---

## Estructura Universal de un Evento

Todo evento persistido en la tabla `events` tiene esta forma:

```
{
  id:         UUID          — identificador único del evento
  store_id:   UUID | null   — tienda afectada (null para eventos de sistema global)
  type:       string        — nombre canónico del evento (snake_case, pasado)
  actor_type: string        — quién originó el evento: "user" | "superadmin" | "system" | "ai"
  actor_id:   UUID | null   — ID del usuario o proceso que disparó la action
  data:       JSONB         — payload específico del evento (ver contrato por tipo)
  created_at: timestamp     — momento del evento (UTC, con timezone)
}
```

---

## Reglas del Contrato

1. **Inmutabilidad:** los eventos no se modifican ni eliminan una vez persistidos.
2. **Idempotencia:** cada action completada exitosamente genera exactamente un evento del tipo correspondiente. No se emite el evento si la action falla.
3. **Atomicidad:** el evento se persiste en la misma transacción que el efecto de negocio. Si la transacción falla, no hay evento.
4. **Payload mínimo pero suficiente:** el payload incluye los datos necesarios para reconstruir qué pasó sin depender de otras tablas.
5. **Clasificación:** cada evento se clasifica como `internal` (para uso del sistema) o `external` (candidato para webhooks hacia integraciones externas).

---

## Catálogo de Eventos

### STORE

---

#### `store_created`
- **Módulo origen:** core (al crear la tienda)
- **Trigger:** `create_store`
- **Clasificación:** internal + external
- **Idempotencia:** un solo evento por creación de tienda
- **Payload:**
```json
{
  "store_id": "uuid",
  "name": "string",
  "slug": "string",
  "status": "demo"
}
```

---

#### `store_updated`
- **Módulo origen:** catalog
- **Trigger:** `update_store`, `update_store_config`
- **Clasificación:** internal
- **Idempotencia:** un evento por ejecución exitosa de la action
- **Payload:**
```json
{
  "store_id": "uuid",
  "fields_updated": ["name", "whatsapp"]
}
```

---

#### `store_status_changed`
- **Módulo origen:** billing / superadmin
- **Trigger:** transiciones de lifecycle (`demo→active`, `active→past_due`, etc.)
- **Clasificación:** internal + external
- **Idempotencia:** un evento por transición; si el status no cambia, no hay evento
- **Payload:**
```json
{
  "store_id": "uuid",
  "previous_status": "demo",
  "new_status": "active",
  "reason": "payment_approved | cron_past_due | superadmin_override | ..."
}
```

---

#### `module_enabled`
- **Módulo origen:** catalog
- **Trigger:** `enable_module`
- **Clasificación:** internal + external
- **Idempotencia:** un evento por activación; si ya estaba activo, no hay evento
- **Payload:**
```json
{
  "store_id": "uuid",
  "module_name": "string"
}
```

---

#### `module_disabled`
- **Módulo origen:** catalog
- **Trigger:** `disable_module`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "module_name": "string"
}
```

---

### PRODUCTS

---

#### `product_created`
- **Módulo origen:** products
- **Trigger:** `create_product`
- **Clasificación:** internal + external
- **Payload:**
```json
{
  "store_id": "uuid",
  "product_id": "uuid",
  "name": "string",
  "price": 5000
}
```

---

#### `product_updated`
- **Módulo origen:** products
- **Trigger:** `update_product`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "product_id": "uuid",
  "fields_updated": ["price", "description"]
}
```

---

#### `product_deleted`
- **Módulo origen:** products
- **Trigger:** `delete_product`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "product_id": "uuid",
  "name": "string"
}
```

---

### ORDERS

---

#### `order_created`
- **Módulo origen:** orders
- **Trigger:** `create_order`
- **Clasificación:** internal + external
- **Payload:**
```json
{
  "store_id": "uuid",
  "order_id": "uuid",
  "total": 15000,
  "items_count": 3,
  "customer_id": "uuid | null"
}
```

---

#### `order_status_updated`
- **Módulo origen:** orders
- **Trigger:** `update_order_status`
- **Clasificación:** internal + external
- **Idempotencia:** un evento por cambio de status; si el status no cambia, no hay evento
- **Payload:**
```json
{
  "store_id": "uuid",
  "order_id": "uuid",
  "previous_status": "pending",
  "new_status": "confirmed"
}
```

---

#### `order_cancelled`
- **Módulo origen:** orders
- **Trigger:** `cancel_order`
- **Clasificación:** internal + external
- **Payload:**
```json
{
  "store_id": "uuid",
  "order_id": "uuid",
  "reason": "string | null"
}
```

---

### PAYMENTS

---

#### `payment_created`
- **Módulo origen:** payments
- **Trigger:** `create_payment`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "payment_id": "uuid",
  "order_id": "uuid",
  "amount": 15000,
  "method": "cash"
}
```

---

#### `payment_approved`
- **Módulo origen:** payments
- **Trigger:** `update_payment_status` con `status: "approved"`
- **Clasificación:** internal + external
- **Idempotencia:** solo se emite una vez; si el pago ya estaba aprobado, no hay evento
- **Payload:**
```json
{
  "store_id": "uuid",
  "payment_id": "uuid",
  "order_id": "uuid",
  "amount": 15000,
  "method": "mp",
  "mp_payment_id": "string | null"
}
```

---

#### `payment_rejected`
- **Módulo origen:** payments
- **Trigger:** `update_payment_status` con `status: "rejected"`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "payment_id": "uuid",
  "order_id": "uuid",
  "amount": 15000
}
```

---

#### `payment_refunded`
- **Módulo origen:** payments
- **Trigger:** `update_payment_status` con `status: "refunded"`
- **Clasificación:** internal + external
- **Payload:**
```json
{
  "store_id": "uuid",
  "payment_id": "uuid",
  "order_id": "uuid",
  "amount": 15000
}
```

---

### STOCK

---

#### `stock_updated`
- **Módulo origen:** stock
- **Trigger:** `update_stock`, `restore_stock`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "stock_item_id": "uuid",
  "product_id": "uuid",
  "variant_id": "uuid | null",
  "previous_quantity": 10,
  "new_quantity": 5
}
```

---

#### `stock_depleted`
- **Módulo origen:** stock
- **Trigger:** `process_stock_deduction` cuando quantity llega a 0
- **Clasificación:** internal + external
- **Idempotencia:** se emite solo cuando la quantity transiciona de > 0 a 0
- **Payload:**
```json
{
  "store_id": "uuid",
  "product_id": "uuid",
  "variant_id": "uuid | null",
  "product_name": "string"
}
```

---

### BILLING (Sistema KitDigital — no del cliente final)

---

#### `subscription_created`
- **Módulo origen:** billing
- **Trigger:** primer pago exitoso de una tienda
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "plan_id": "uuid",
  "amount": 5000,
  "next_billing_date": "date"
}
```

---

#### `subscription_renewed`
- **Módulo origen:** billing
- **Trigger:** webhook de Mercado Pago confirma renovación
- **Clasificación:** internal + external
- **Payload:**
```json
{
  "store_id": "uuid",
  "payment_id": "uuid",
  "amount": 5000,
  "next_billing_date": "date"
}
```

---

#### `subscription_payment_failed`
- **Módulo origen:** billing
- **Trigger:** webhook de MP con pago rechazado o cron de vencimiento
- **Clasificación:** internal + external
- **Payload:**
```json
{
  "store_id": "uuid",
  "reason": "payment_rejected | trial_expired"
}
```

---

### USERS & ACCESS

---

#### `store_user_invited`
- **Módulo origen:** multiuser
- **Trigger:** `invite_store_user`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "invited_email": "string",
  "role": "admin | collaborator",
  "invited_by": "uuid"
}
```

---

#### `store_user_role_updated`
- **Módulo origen:** multiuser
- **Trigger:** `update_store_user_role`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "store_user_id": "uuid",
  "previous_role": "collaborator",
  "new_role": "admin"
}
```

---

#### `store_user_removed`
- **Módulo origen:** multiuser
- **Trigger:** `remove_store_user`
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "store_user_id": "uuid",
  "user_id": "uuid"
}
```

---

### AI

---

#### `assistant_action_executed`
- **Módulo origen:** assistant
- **Trigger:** `execute_assistant_action` exitoso
- **Clasificación:** internal
- **Payload:**
```json
{
  "store_id": "uuid",
  "action_name": "string",
  "tokens_consumed": 120
}
```

---

## Tabla de Eventos por Clasificación

| Evento | Clasificación |
|--------|--------------|
| `store_created` | internal + external |
| `store_updated` | internal |
| `store_status_changed` | internal + external |
| `module_enabled` | internal + external |
| `module_disabled` | internal |
| `product_created` | internal + external |
| `product_updated` | internal |
| `product_deleted` | internal |
| `order_created` | internal + external |
| `order_status_updated` | internal + external |
| `order_cancelled` | internal + external |
| `payment_created` | internal |
| `payment_approved` | internal + external |
| `payment_rejected` | internal |
| `payment_refunded` | internal + external |
| `stock_updated` | internal |
| `stock_depleted` | internal + external |
| `subscription_created` | internal |
| `subscription_renewed` | internal + external |
| `subscription_payment_failed` | internal + external |
| `store_user_invited` | internal |
| `store_user_role_updated` | internal |
| `store_user_removed` | internal |
| `assistant_action_executed` | internal |

---

## Eventos Obligatorios del Foundation Paper

Los siguientes eventos son requeridos explícitamente por el sistema base:

| Evento en Foundation Paper | Nombre canónico aquí |
|---------------------------|---------------------|
| `product_created` | `product_created` ✅ |
| `order_created` | `order_created` ✅ |
| `payment_success` | `payment_approved` ✅ |
| `module_enabled` | `module_enabled` ✅ |

---

## Cómo se Emiten los Eventos

Los eventos se emiten dentro del executor, en el paso 6 del pipeline, **dentro de la misma transacción** que el efecto de negocio.

Si la transacción falla, el evento no se persiste.
Si el evento no puede persistirse, la transacción falla (los eventos son parte de la operación, no un efecto secundario opcional).

→ Pipeline completo: `/system/backend/execution-model.md`
