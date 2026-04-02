# Multi-Tenant Architecture — KitDigital.AR

## Propósito

Este archivo define cómo el sistema aísla y gestiona múltiples tenants (tiendas) dentro de una única infraestructura compartida.

→ Fundamento de negocio: `/docs/architecture.md`
→ Regla global de store_id: `/system/constraints/global-rules.md` R1, R2
→ Decisión de diseño: `/system/core/decisions.md` DEC-002

---

## Modelo de Tenancy

KitDigital usa **aislamiento por dato**, no por infraestructura.

Una sola instancia del sistema, una sola base de datos, un solo schema de Postgres.
Cada tienda es diferenciada por su `store_id` en cada fila de cada tabla de dominio.

No existe:
- un schema de Postgres por tienda
- una base de datos por tienda
- un servidor o instancia por tienda

---

## Identificador de Tenant

El identificador universal de tenant es `store_id: UUID`.

- Es un UUID v4 generado en el momento de creación de la tienda.
- Es inmutable: una vez asignado a una entidad, no cambia.
- Es el campo de partición de toda la data de dominio.
- Toda entidad de dominio lo tiene como campo obligatorio no nulo.

→ Campos universales obligatorios: `/system/core/domain-language.md`

---

## Resolución de Tienda

Antes de procesar cualquier request, el sistema debe identificar a qué tienda pertenece.

El mecanismo de resolución sigue este orden de precedencia:

### 1. Subdominio (caso principal)
```
{slug}.kitdigital.ar
```
- `slug` es el identificador único legible de la tienda (ej: `ropa-belen`)
- Se busca en la tabla `stores` por `slug`
- Si no existe o está `archived`, devuelve 404

### 2. Dominio custom (módulo `custom_domain` activo)
```
mitienda.com
```
- Se lee el header `Host` del request
- Se busca en `stores` por `custom_domain`
- Solo válido si la tienda tiene el módulo `custom_domain` activo y el dominio está verificado
- Si el módulo no está activo o el dominio no está verificado, redirige al subdominio canónico

### 3. Rutas especiales del sistema
```
kitdigital.ar/demo/{slug}     → tienda en modo demo
kitdigital.ar/archived/{slug} → tienda archivada (solo lectura)
```
- Rutas reservadas para acceso especial
- No usan subdominio propio
- Las tiendas `archived` solo son accesibles por esta ruta

### 4. Panel de gestión (autenticado)
```
app.kitdigital.ar/dashboard
```
- El `store_id` se resuelve desde la sesión del usuario autenticado
- Si el usuario tiene acceso a múltiples tiendas, el contexto de tienda activa está en la sesión
- El superadmin puede cambiar el contexto de tienda a cualquiera (impersonación)

---

## Aislamiento de Datos

### Row Level Security (RLS)

Supabase implementa RLS a nivel de base de datos.

Toda tabla de dominio tiene políticas RLS que garantizan:
- `SELECT`: solo filas donde `store_id = auth.store_id()` o superadmin
- `INSERT`: solo con `store_id` del store resuelto en el contexto actual
- `UPDATE`: solo filas donde `store_id = auth.store_id()`
- `DELETE`: solo filas donde `store_id = auth.store_id()`

El `auth.store_id()` es una función de Postgres que lee el `store_id` del JWT del usuario autenticado.

RLS es la **última línea de defensa**. El backend también aplica `store_id` en todas las queries.
La doble validación (backend + RLS) garantiza que incluso si hay un bug en el backend, la DB no entrega datos cruzados.

### Validación en Backend

Adicionalmente a RLS, el backend:
1. Resuelve el `store_id` del contexto (subdominio, sesión, o header)
2. Lo inyecta en todas las queries como filtro explícito
3. Nunca acepta `store_id` del cliente como parámetro de confianza para operaciones de escritura

---

## Contexto de Tienda en el Request

El contexto de tienda es un objeto resuelto en el middleware de servidor antes de cualquier handler:

```
StoreContext {
  store_id:   UUID
  slug:       string
  status:     StoreStatus
  modules:    Record<string, boolean>
  limits:     { max_products, max_orders, ai_tokens }
  billing:    { trial_ends_at, next_billing_date, last_payment_date, status }
}
```

Este contexto se construye una vez por request y se propaga a:
- el executor (para validar módulos y límites)
- los módulos (para resolver ownership)
- el sistema de eventos (para registrar `store_id` en cada evento)

El contexto de tienda nunca se construye desde parámetros del cliente. Siempre se resuelve desde el servidor.

---

## Operaciones Cruzadas de Tenants

Por defecto, **ninguna operación cruza el boundary de un tenant**.

Las excepciones son exclusivas del superadmin:

| Operación | Actor | Descripción |
|-----------|-------|-------------|
| `list_stores` | superadmin | Lista todas las tiendas sin filtro de store_id |
| `get_store` | superadmin | Accede a cualquier tienda por ID |
| `impersonate_store` | superadmin | Establece el contexto de tienda de otro tenant |
| `update_store_status` | superadmin | Cambia el estado de cualquier tienda |
| `override_store_limits` | superadmin | Modifica límites de cualquier tienda |
| Cron jobs de billing | system | Verifican vencimientos de todas las tiendas |
| Webhook handlers | system | Procesan pagos y actualizan tiendas |

Toda operación cruzada del superadmin queda registrada como evento con `actor: superadmin`.

---

## Aislamiento de Medios (Cloudinary)

Las imágenes de productos y tiendas se almacenan en Cloudinary.

La estructura de carpetas en Cloudinary también aísla por tenant:

```
kitdigital/{store_id}/products/{filename}
kitdigital/{store_id}/banners/{filename}
kitdigital/{store_id}/store/{filename}
```

El `store_id` forma parte del path de upload y se verifica en el backend antes de hacer el upload.
Un usuario no puede subir archivos a la carpeta de otra tienda.

---

## Aislamiento de Cache (Upstash Redis)

Las keys de Redis incluyen el `store_id` como prefijo:

```
store:{store_id}:products
store:{store_id}:categories
store:{store_id}:config
```

Al invalidar cache de una tienda, solo se invalidan keys con su `store_id`.
No existe cache global de dominio sin scope de tienda.

---

## Índices de Performance

Para que el modelo multi-tenant escale, las tablas de dominio deben tener índices que soporten el patrón de acceso:

- Índice en `store_id` en todas las tablas de dominio (obligatorio)
- Índices compuestos en `(store_id, created_at)` para listados paginados
- Índices compuestos en `(store_id, status)` para filtros frecuentes (orders, products)

Sin estos índices, las queries con `WHERE store_id = ?` hacen full table scan al crecer el volumen.

→ Índices completos declarados en: `/system/database/schema.md`

---

## Límites de Tenant

Cada tienda tiene límites que el sistema aplica en el executor:

| Límite | Descripción | Dónde se aplica |
|--------|-------------|----------------|
| `max_products` | Cantidad máxima de productos activos | `create_product` |
| `max_orders` | Cantidad máxima de pedidos por mes | `create_order` |
| `ai_tokens` | Tokens de IA disponibles por período | Toda invocación de IA |

Los límites viven en `store.limits` (JSONB de la tabla `stores`).
El superadmin puede modificarlos individualmente.
El plan base define los valores por defecto.

→ Validación de límites: `/system/backend/execution-model.md`

---

## Estados de Tienda y su Efecto en Multi-Tenancy

| Estado | Vitrina pública | Panel de gestión | API |
|--------|----------------|-----------------|-----|
| `demo` | Accesible (con banner de demo) | Acceso completo con límites | Restringida a límites de demo |
| `active` | Accesible | Acceso completo | Sin restricciones de estado |
| `past_due` | Accesible (puede mantenerse) | Acceso solo lectura | Solo GETs; no creates ni updates críticos |
| `suspended` | No accesible (404) | No accesible | Bloqueada; devuelve `STORE_INACTIVE` |
| `archived` | Solo vía `/archived/{slug}` (solo lectura) | No accesible | Solo lectura; sin writes |

El estado se verifica en el middleware de resolución de tienda, antes del executor.

→ Transiciones de estado: `/system/flows/lifecycle.md`
