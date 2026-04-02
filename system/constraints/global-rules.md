# Global Rules — KitDigital.AR

## Propósito

Este archivo es la constitución técnica del sistema.

Toda regla aquí aplica a absolutamente todo: módulos, backend, frontend, IA, billing, superadmin, flows.
Si una regla no está aquí, no existe como regla global.
Si está aquí y no se aplica, es un bug de diseño.

Las excepciones a estas reglas solo son válidas si están documentadas en `/system/core/decisions.md` con justificación explícita.

---

## REGLA 1 — Todo tiene store_id

**Toda entidad que pertenece a una tienda tiene el campo `store_id: UUID`.**

Sin excepción.

- No existe un producto, pedido, cliente, pago, evento, categoría, banner, o cualquier otra entidad de dominio sin `store_id`.
- Las únicas entidades sin `store_id` son las de sistema global: `users`, `plans`, `subscriptions`.
- El `store_id` no puede ser `null` en ninguna entidad de dominio.
- El `store_id` de una entidad no cambia una vez asignado.

→ Campos obligatorios por entidad: ver `/system/core/domain-language.md`

---

## REGLA 2 — Toda query filtra por store_id

**Toda consulta a la base de datos que accede a entidades de dominio incluye obligatoriamente el filtro `WHERE store_id = currentStoreId`.**

- No existe lectura de datos de dominio sin scope de tienda, excepto en operaciones explícitas de superadmin.
- En operaciones de superadmin, el scope se declara explícitamente como "operación global".
- El `currentStoreId` se resuelve en la capa de servidor antes de ejecutar cualquier query; nunca viene del cliente sin validación.

---

## REGLA 3 — Toda action valida módulos

**Antes de ejecutar cualquier action que dependa de un módulo, se verifica que ese módulo esté activo para la tienda.**

```
if (!store.modules[module_name]) throw MODULE_INACTIVE
```

- Esta validación ocurre en el executor, no en la lógica de negocio del módulo.
- Una action con `requires: []` (CORE) no tiene esta validación de módulo, pero sí todas las demás.
- Un módulo inactivo no puede ser invocado bajo ninguna circunstancia, ni por usuario, ni por IA, ni por sistema.

→ Pipeline completo: `/system/backend/execution-model.md`

---

## REGLA 4 — Toda action valida límites del plan

**Antes de ejecutar una action que pueda exceder un límite del plan, se verifica el límite actual.**

- Los límites se definen por plan: `max_products`, `max_orders`, `ai_tokens`.
- La validación ocurre en el executor antes de ejecutar la lógica.
- Al exceder un límite, se devuelve `LIMIT_EXCEEDED` y no se ejecuta la action.
- El superadmin puede modificar límites individuales de tiendas.

---

## REGLA 5 — Naming es ley

**Todo nombre de entidad, action, evento y campo debe respetar las convenciones de `/system/core/domain-language.md`.**

- Lo que no cumple la convención es inválido.
- Un nombre que no está en `domain-language.md` se agrega antes de usarlo.
- No se usan sinónimos, traducciones ni variantes de nombres ya definidos.
- Excepciones solo en `decisions.md` con justificación.

---

## REGLA 6 — La IA no ejecuta directamente

**La IA genera acciones en formato JSON. El executor es quien valida y ejecuta.**

- La IA nunca llama directamente a una función de base de datos.
- La IA nunca modifica estado sin pasar por el executor.
- El executor aplica el mismo pipeline de validación para actions de IA que para actions de usuarios.
- La IA no tiene un "modo privilegiado" que bypasee validaciones.

→ Formato de output de IA: `/system/core/action-contract.md`
→ Execution de IA: `/system/ai/execution.md`

---

## REGLA 7 — No hay lógica duplicada

**Una regla de negocio existe en un solo lugar. Si debe usarse en otro lugar, se referencia, no se copia.**

- No existe la misma validación implementada en dos módulos distintos.
- No existe la misma lógica de transformación en frontend y backend.
- Si se detecta duplicación, se extrae a la capa centralizada correspondiente.

---

## REGLA 8 — Los módulos no cruzan ownership

**Un módulo solo escribe en las tablas y entidades que le pertenecen.**

- La propiedad de cada entidad se declara en `Entities owned` dentro del módulo.
- Escrituras cruzadas entre módulos se hacen vía actions públicas del módulo propietario, nunca directamente.
- Lecturas directas controladas están permitidas bajo las condiciones definidas en `/system/system-build-plan.md` (sección Boundaries).

---

## REGLA 9 — El lifecycle de tienda es sagrado

**Los estados de `store.status` son exactamente: `demo`, `active`, `past_due`, `suspended`, `archived`.**

- No se crean estados nuevos sin documentar en `decisions.md`.
- No se omiten transiciones válidas.
- Toda acción de negocio verifica el estado de la tienda antes de ejecutarse.
- Un estado `archived` bloquea toda operación de dominio. Solo el superadmin puede restaurar.
- Un estado `suspended` bloquea toda operación. Solo el superadmin puede levantar.

→ Tabla de estados y transiciones: `/system/billing/billing.md` y `/system/flows/lifecycle.md`

---

## REGLA 10 — El superadmin tiene control total

**El superadmin puede auditar, modificar o bloquear cualquier tienda, usuario o configuración del sistema.**

- El superadmin puede impersonar cualquier tienda (operar como ella).
- El superadmin puede overridear billing y límites.
- Las acciones del superadmin se registran como eventos con `actor: superadmin`.
- No existe operación de sistema que el superadmin no pueda ver.

→ Capacidades detalladas: `/system/superadmin/superadmin.md`

---

## REGLA 11 — Todo evento es inmutable

**Un evento registrado no se modifica ni se elimina.**

- Los eventos son el historial del sistema.
- Si un evento fue registrado con datos incorrectos, se registra un nuevo evento correctivo; no se edita el original.
- Los eventos tienen `store_id` donde aplica.

→ Contrato de eventos: `/system/core/events.md`

---

## REGLA 12 — Mobile-first es obligatorio en frontend

**Todo componente y toda pantalla se diseña primero para mobile.**

- No existe pantalla que solo funcione en desktop.
- Los breakpoints se definen desde el tamaño más pequeño hacia arriba.
- La vitrina pública (acceso del cliente final) debe ser 100% funcional en mobile con experiencia nativa.

→ Reglas de frontend: `/system/frontend/frontend-rules.md`

---

## REGLA 13 — JSONB es para extensiones, no para lógica

**Los campos JSONB en la base de datos se usan exclusivamente para atributos variables y opcionales.**

- No hay lógica de negocio crítica dentro de campos JSONB.
- No hay queries que filtren por campos dentro de JSONB en rutas críticas de performance.
- Los campos JSONB son: `store.config`, `store.modules`, `store.billing`, `product.metadata`, `order.metadata`.
- Toda extensión de módulo que requiera lógica de negocio tiene columna propia, no vive en metadata.

---

## REGLA 14 — No hay múltiples bases de datos por tienda

**El sistema usa una sola base de datos Supabase para todos los tenants.**

- El aislamiento es por `store_id`, no por base de datos separada.
- No se crean schemas separados por tienda en Postgres.
- No se usan microservicios con bases propias.

→ Fundamento: `/docs/architecture.md`

---

## REGLA 15 — Todo debe escalar a 10.000 tiendas

**Toda decisión de diseño debe funcionar con 10 tiendas y con 10.000 tiendas activas simultáneamente.**

- Las queries deben tener índices en `store_id` y en los campos de filtro principales.
- No se hacen consultas sin límite sobre tablas de dominio.
- Las operaciones de cron o background no bloquean el acceso de usuarios.

---

## REGLA 16 — Simplicidad sobre complejidad

**Si una solución más simple resuelve el problema, se usa la solución más simple.**

- La complejidad se agrega solo cuando el problema la exige demostrado con un caso real.
- No se anticipa complejidad futura que no es necesaria hoy.
- Un módulo nuevo no se construye hasta que hay al menos un usuario que lo necesita.

---

## Resumen de Enforcement

| Regla | Dónde se aplica |
|-------|----------------|
| R1 — store_id | Schema, módulos, backend |
| R2 — query scoping | Backend, todas las queries |
| R3 — validar módulos | Executor (backend) |
| R4 — validar límites | Executor (backend) |
| R5 — naming | Todos los archivos de /system |
| R6 — IA no ejecuta | IA, executor |
| R7 — no duplicación | Módulos, backend, frontend |
| R8 — boundaries de módulos | Módulos, schema |
| R9 — lifecycle | Billing, executor, flows |
| R10 — superadmin total | Superadmin, backend |
| R11 — eventos inmutables | Backend, schema |
| R12 — mobile-first | Frontend, design |
| R13 — JSONB para extensiones | Schema, módulos |
| R14 — una sola DB | Arquitectura, infra |
| R15 — escalar a 10k | Schema (índices), backend |
| R16 — simplicidad | Todo |
