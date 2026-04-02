# System Build Plan — KitDigital.AR

## Propósito de este documento

Define el orden, las dependencias, los riesgos y la estrategia para construir /system de forma completa, coherente y sin contradicciones.

Ningún archivo de /system se crea antes de que este plan esté claro.

---

## Source of Truth por Capa

| Área | Source of Truth | Archivo |
|------|----------------|---------|
| Negocio y producto | /docs | fundamentals.md, product.md |
| Lenguaje del dominio | /system/core | domain-language.md |
| Contrato de actions | /system/core | action-contract.md |
| Reglas globales técnicas | /system/constraints | global-rules.md |
| Comportamiento del sistema | /system/modules | [módulo].md |
| Contrato de eventos | /system/core | events.md |
| Estructura de datos | /system/database | schema.md |
| Reglas de ejecución backend | /system/backend | backend-rules.md |
| Pipeline de ejecución | /system/backend | execution-model.md |
| Comportamiento de IA | /system/ai | ai-behavior.md, execution.md |
| Billing y lifecycle | /system/billing | billing.md |
| UI y componentes | /system/design | system-design.md, components.md |
| Flujos de usuario | /system/flows | [flow].md |

Ninguna capa redefine lo que otra ya definió. Si necesita referenciarlo, lo cita.

**Coherencia con /docs:** Todo lo que se escriba en /system debe ser compatible con `/docs` (negocio y producto). `/system` detalla y opera; no redefine el propósito del producto. Si hay tensión, se resuelve en `decisions.md` con referencia explícita a los documentos de /docs afectados.

---

## Reglas de Boundaries de Módulos

Cada módulo tiene responsabilidad exclusiva sobre su dominio.

**Un módulo NO puede:**
- escribir datos en tablas que pertenecen a otro módulo
- definir actions que corresponden al dominio de otro módulo
- duplicar lógica de validación que ya existe en otro módulo
- asumir el estado interno de otro módulo sin pasar por sus actions públicas

**Un módulo SÍ puede:**
- leer datos de otro módulo a través de sus actions públicas declaradas
- declarar una dependencia explícita hacia otro módulo
- extender entidades propias con datos que otros módulos necesitan exponer

**Interacción entre módulos — regla por defecto:** las escrituras y efectos de negocio cruzados pasan por **actions públicas** del módulo propietario.

**Lectura entre módulos — excepción controlada:** la lectura directa (por ejemplo consultas o joins internos en la capa de datos) está permitida solo si:
- no rompe el encapsulamiento lógico (el módulo dueño sigue siendo la única fuente de verdad para mutar su dominio)
- no duplica reglas de negocio que ya pertenecen a otro módulo
- queda documentada en el módulo consumidor bajo **External reads** en Data Impact
- si el patrón es no trivial o reutilizable, queda registrado en `decisions.md`

Si dos módulos necesitan interactuar de una forma no prevista, eso se documenta en `decisions.md` antes de implementarse.

---

## 1. Orden de Creación de Archivos

### GRUPO 1 — Fundación

Sin dependencias externas. Son los axiomas del sistema.

**Archivos:**

```
/system/core/domain-language.md
/system/core/action-contract.md
/system/constraints/global-rules.md
/system/core/anti-patterns.md
/system/core/system-overview.md
/system/core/decisions.md
```

**Orden interno recomendado (obligatorio):**

1. `domain-language.md` — nomenclatura de entidades, pluralización, convención de IDs, formato de nombres.
2. `action-contract.md` — formato estándar de toda action: naming en `snake_case`, **tipología de actions** (`create_*`, `update_*`, `delete_*`, `get_*`, `list_*`, `execute_*` u otras categorías explícitas definidas ahí), input y output shape, errores posibles, validaciones obligatorias, relación con `store_id`, permisos. Conecta módulos, backend, IA y execution.
3. `global-rules.md` — reglas que aplican a todo el sistema. Debe incluir la **regla dura de naming:** toda entidad, action, tipo de evento y nombre de campo nuevo debe cumplir `domain-language.md`; lo que no cumpla es inválido hasta corregirse o documentarse como excepción en `decisions.md`.
4. `anti-patterns.md` — lo prohibido.
5. `system-overview.md` — vista técnica única del sistema.
6. `decisions.md` — registro de decisiones arquitectónicas.

**Por qué este orden interno:** `action-contract.md` depende de las convenciones de `domain-language.md`. `global-rules.md` y `anti-patterns.md` se apoyan en el contrato de actions donde aplica. `system-overview.md` integra el todo sin adelantar contenido que contradiga lo anterior. `decisions.md` cierra el grupo registrando excepciones.

**VALIDATION GATE — Grupo 1:**
- [ ] El contenido del Grupo 1 es **consistente con `/docs/fundamentals.md` y `/docs/architecture.md`** (sin contradicción de propósito, principios ni stack)
- [ ] `domain-language.md` define todos los nombres de entidades core y convenciones sin ambigüedad
- [ ] `action-contract.md` es completo: toda action futura debe poder describirse sin salirse del contrato; incluye tipología de actions y naming uniforme
- [ ] Las reglas de `global-rules.md` no se contradicen entre sí ni con `action-contract.md`; incluye la regla dura: nombres de entidades, actions, eventos y campos sujetos a `domain-language.md`
- [ ] `anti-patterns.md` cubre al menos: duplicación, IA ejecutando directamente, lógica fuera de módulos, acceso sin `store_id`
- [ ] `system-overview.md` es coherente con `/docs/architecture.md` en stack y propósito

---

### GRUPO 2 — Arquitectura

Depende del Grupo 1.

```
/system/architecture/multi-tenant.md
```

**VALIDATION GATE — Grupo 2:**
- [ ] `multi-tenant.md` explica el aislamiento sin contradecir `global-rules.md`
- [ ] No define tablas ni estructuras de datos (Grupo 4)

---

### GRUPO 3 — Módulos

Dependen de los Grupos 1 y 2. El schema se deriva de estos módulos, no al revés.

```
/system/modules/catalog.md
/system/modules/products.md
/system/modules/categories.md
/system/modules/cart.md
/system/modules/orders.md
/system/modules/stock.md
/system/modules/payments.md
/system/modules/variants.md
/system/modules/wholesale.md
/system/modules/shipping.md
/system/modules/finance.md
/system/modules/banners.md
/system/modules/social.md
/system/modules/product_page.md
/system/modules/multiuser.md
/system/modules/custom_domain.md
/system/modules/tasks.md
/system/modules/savings_account.md
/system/modules/expenses.md
/system/modules/assistant.md
```

**Orden interno por dependencias:**

| # | Módulo | Depende de |
|---|--------|-----------|
| 1 | catalog | (ninguno) |
| 2 | products | catalog |
| 3 | categories | catalog |
| 4 | cart | products, catalog |
| 5 | orders | cart, products |
| 6 | stock | products |
| 7 | payments | orders |
| 8 | variants | products, stock |
| 9 | wholesale | products, catalog |
| 10 | shipping | orders, cart |
| 11 | finance | payments, orders |
| 12 | banners | (ninguno) |
| 13 | social | (ninguno) |
| 14 | product_page | products |
| 15 | multiuser | store (core) |
| 16 | custom_domain | store (core) |
| 17 | tasks | orders |
| 18 | savings_account | finance, payments |
| 19 | expenses | finance |
| 20 | assistant | todos los anteriores |

**Estructura obligatoria de cada módulo:**

La sección **Actions** declara solo actions que cumplen `action-contract.md` (nombre, input, output, errores, permisos).

La sección **Data Impact** es auditable y obligatoria. Cada subapartado debe estar completo:

- **Entities owned:** entidades o agregados de los que el módulo es dueño (sin ambigüedad de ownership).
- **Fields:** atributos clave por entidad propia; metadata solo donde el schema lo permita explícitamente.
- **Relationships:** cardinalidad y dirección respecto a otras entidades (sin SQL).
- **External reads:** lecturas de datos bajo responsabilidad de otro módulo (motivo; si hay lectura directa controlada, declararla aquí).

```
# Module: NAME

## Purpose
## Dependencies
## Data Impact
### Entities owned
### Fields
### Relationships
### External reads
## Actions
## UI Components
## Constraints
## Edge Cases
## Future Extensions
```

**VALIDATION GATE — Grupo 3:**
- [ ] Los 20 módulos tienen todas las secciones completas, incluido **Data Impact** con los cuatro subapartados
- [ ] Cada entidad declarada en **Entities owned** es inequívoca (sin solapamiento de ownership entre módulos salvo decisión en `decisions.md`)
- [ ] Cada action listada cumple el contrato definido en `action-contract.md`
- [ ] Ningún módulo escribe en tablas de otro módulo
- [ ] Ningún módulo duplica actions de otro
- [ ] Las dependencias coinciden con la tabla
- [ ] Nomenclatura alineada con `domain-language.md`
- [ ] `assistant.md` lista explícitamente los módulos sobre los que actúa y **no define lógica de negocio propia**: solo orquesta o invoca actions ya definidas en otros módulos

---

### GRUPO 4 — Base de Datos

Depende del Grupo 3.

```
/system/core/events.md
/system/database/schema.md
```

**`events.md` no es solo una lista de nombres.** Es el **contrato de eventos del sistema**. Debe definir, por cada tipo de evento:

- nombre estable (`order_created`, etc.)
- módulo origen
- trigger: qué action del dominio lo dispara
- estructura del payload
- idempotencia (cómo se evita duplicar efectos)
- clasificación: evento interno del sistema vs evento expuesto hacia integraciones o webhooks

Esto evita eventos inconsistentes, webhooks caóticos y debugging imposible.

**Orden interno:**
1. `events.md` — contrato de eventos derivado de las actions de los módulos
2. `schema.md` — consolidación de Data Impact de módulos + tabla de eventos + reglas de diseño

**VALIDATION GATE — Grupo 4:**
- [ ] Cada evento enlaza una action declarada en algún módulo
- [ ] Cada evento tiene payload, trigger e idempotencia definidos en el contrato
- [ ] Cada tabla del schema corresponde a una entidad en **Entities owned** de algún módulo (o al subsistema de eventos/billing/core explícito en el schema); no hay tablas huérfanas
- [ ] No hay dos módulos que declaren ownership incompatible sobre la misma entidad sin entrada en `decisions.md`
- [ ] El schema incluye persistencia de eventos según el contrato
- [ ] `store_id` aplicado según `global-rules.md`

---

### GRUPO 5 — Backend

Depende de los Grupos 1, 3 y 4.

```
/system/backend/backend-rules.md
/system/backend/execution-model.md
```

**`backend-rules.md`** — principios: validación de módulos, `store_id` en queries, centralización, sin lógica duplicada.

**`execution-model.md`** — motor del sistema: pipeline completo de ejecución de una action:

1. request entrante
2. validar módulo activo para la tienda
3. validar límites del plan
4. validar input según `action-contract.md`
5. ejecutar la lógica de la action (módulo dueño)
6. emitir eventos según `events.md`
7. response según contrato de output

Sin este archivo, `backend-rules.md` puede quedar solo como principios abstractos; el pipeline es la referencia operativa para implementación y para alinear IA con backend.

**VALIDATION GATE — Grupo 5:**
- [ ] `backend-rules.md` y `execution-model.md` no se contradicen
- [ ] El pipeline referencia explícitamente `action-contract.md` y `events.md`
- [ ] No se duplica lógica de negocio de módulos (solo orquestación y reglas transversales)

---

### GRUPO 6 — IA

Depende de los Grupos 3 y 5.

```
/system/ai/ai-behavior.md
/system/ai/actions.md
/system/ai/execution.md
```

**VALIDATION GATE — Grupo 6:**
- [ ] Cada action en `actions.md` existe como action pública en algún módulo
- [ ] `execution.md` alinea la salida de la IA con el mismo pipeline que `execution-model.md` (sin atajos)
- [ ] No hay ejecución directa de la IA sin pasar por el executor

---

### GRUPO 7 — Billing y Superadmin

```
/system/billing/billing.md
/system/billing/webhooks.md
/system/superadmin/superadmin.md
```

**VALIDATION GATE — Grupo 7:**
- [ ] `billing.md` cubre todos los estados de lifecycle de `global-rules.md`
- [ ] `webhooks.md` mapea a eventos definidos en `events.md`
- [ ] `superadmin.md` lista overrides por módulo y capacidades sin ambigüedad

---

### GRUPO 8 — Frontend y Design

```
/system/frontend/frontend-rules.md
/system/design/system-design.md
/system/design/components.md
```

**Orden interno:** `frontend-rules.md` → `system-design.md` → `components.md`

**VALIDATION GATE — Grupo 8:**
- [ ] `frontend-rules.md` no contiene lógica de dominio de módulos
- [ ] `components.md` cubre todos los UI Components declarados en módulos
- [ ] Master UI Page coherente con `system-design.md`

---

### GRUPO 9 — Flows

```
/system/flows/onboarding.md
/system/flows/billing.md
/system/flows/lifecycle.md
```

**VALIDATION GATE — Grupo 9:**
- [ ] Cada paso referencia módulo, backend o sistema concreto
- [ ] Estados de tienda idénticos a `global-rules.md`

---

### GRUPO 10 — Checklists

```
/system/checklists/fase-0.md
```

**VALIDATION GATE — Grupo 10:**
- [ ] Existen los 44 archivos del plan
- [ ] Sin secciones vacías ni placeholders sin resolver
- [ ] `fase-0.md` alineado con `/docs/roadmap.md` Fase 0

---

## 2. Mapa de Dependencias

```
domain-language.md
action-contract.md        ← domain-language.md
global-rules.md           ← action-contract.md (donde aplica)
anti-patterns.md
system-overview.md
decisions.md

multi-tenant.md           ← global-rules.md

[módulos]                 ← global-rules.md, anti-patterns.md, domain-language.md, action-contract.md
assistant.md              ← todos los módulos anteriores

events.md                 ← actions de todos los módulos, action-contract.md
schema.md                 ← Data Impact de módulos, events.md, multi-tenant.md, global-rules.md

backend-rules.md          ← global-rules.md, schema.md, action-contract.md, módulos
execution-model.md        ← backend-rules.md, action-contract.md, events.md, global-rules.md

ai-behavior.md            ← assistant.md, global-rules.md
actions.md                ← ai-behavior.md, action-contract.md, módulos
execution.md              ← actions.md, execution-model.md, backend-rules.md

billing.md                ← schema.md, global-rules.md, events.md
webhooks.md               ← billing.md, events.md
superadmin.md             ← módulos, billing.md, schema.md

frontend-rules.md         ← global-rules.md, módulos
system-design.md          ← frontend-rules.md, módulos
components.md             ← system-design.md, módulos

flows/onboarding.md       ← módulos, billing.md, execution.md, execution-model.md
flows/billing.md          ← billing.md, webhooks.md, events.md
flows/lifecycle.md        ← billing.md, schema.md, global-rules.md

checklists/fase-0.md      ← /system completo, /docs/roadmap.md
```

---

## 3. Archivos Críticos

| Archivo | Rol |
|---------|-----|
| `domain-language.md` | Contrato de nomenclatura; evita drift entre archivos |
| `action-contract.md` | Contrato único de actions; alinea módulos, backend, IA y ejecución |
| `global-rules.md` | Constitución técnica transversal |
| `events.md` | Contrato de eventos; base para auditoría, webhooks y consistencia |
| `execution-model.md` | Pipeline de ejecución; motor operativo del sistema |
| `schema.md` | Fuente de verdad de datos; se escribe después de módulos |
| `system-overview.md` | Punto de entrada a /system |
| `anti-patterns.md` | Límites explícitos de lo prohibido |
| Los 20 módulos | Mayor parte del comportamiento del sistema |

---

## 4. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Schema desincronizado con módulos | Schema solo en Grupo 4; cada tabla con módulo propietario |
| Drift de nomenclatura | `domain-language.md` y `action-contract.md` antes que módulos |
| Boundaries violados entre módulos | Escritura solo en tablas propias; lecturas cruzadas documentadas en External reads; casos complejos en `decisions.md` |
| Dependencias circulares entre módulos | Orden de la tabla del Grupo 3; circularidades a `decisions.md` |
| Actions sin contrato uniforme | `action-contract.md` en Grupo 1; gates verifican cumplimiento |
| Eventos inconsistentes | `events.md` como contrato formal, no lista suelta |
| IA sin alineación con ejecución real | Grupo 6 después de Grupo 5; `execution.md` depende de `execution-model.md` |
| Flows sobre sistemas indefinidos | Flows en Grupo 9 |
| Módulos vs global-rules | Excepciones solo en `decisions.md` con justificación |

---

## 5. Estrategia de Consistencia

- **Referencia, no repetición:** se cita el archivo fuente; no se redefine.
- **Responsabilidad única:** un archivo, un propósito principal.
- **Árbitros:** `domain-language.md` para nombres (regla dura en `global-rules.md`); `action-contract.md` para shape y tipología de actions; `events.md` para eventos.
- **Alineación /docs ↔ /system:** antes de cerrar Grupo 1 y en la validación final, se comprueba que no haya contradicción con los documentos de negocio y arquitectura en /docs.
- **Validation gates:** ningún grupo cerrado sin pasar su gate; si falla, no se avanza.
- **Excepciones:** solo en `decisions.md` con contexto y justificación.

---

## 6. Validación Final de /system

- [ ] **44 archivos** del plan presentes y completos
- [ ] **Coherencia global con /docs:** sin contradicción con `fundamentals.md`, `product.md`, `architecture.md`, `database.md` (nivel conceptual), `business.md`, `roadmap.md` donde aplique
- [ ] Módulos: secciones completas incluido Data Impact auditado; actions conformes a `action-contract.md`
- [ ] Schema: tablas justificadas por **Entities owned**; eventos persistidos según contrato
- [ ] Backend: `execution-model.md` coherente con módulos y eventos
- [ ] IA: cada action mapea a módulo; ejecución alineada al pipeline; assistant sin lógica de negocio duplicada
- [ ] Sin contradicciones entre capas ni nombres duplicados con distinto significado; todo naming sometido a `domain-language.md` salvo excepción en `decisions.md`

---

## Resumen del Orden de Ejecución

| Grupo | Contenido | Cantidad |
|-------|-----------|----------|
| 1 — Fundación | domain-language, action-contract, global-rules, anti-patterns, system-overview, decisions | 6 |
| 2 — Arquitectura | multi-tenant | 1 |
| 3 — Módulos | catalog → assistant | 20 |
| 4 — Base de datos | events, schema | 2 |
| 5 — Backend | backend-rules, execution-model | 2 |
| 6 — IA | ai-behavior, actions, execution | 3 |
| 7 — Billing y Superadmin | billing, webhooks, superadmin | 3 |
| 8 — Frontend y Design | frontend-rules, system-design, components | 3 |
| 9 — Flows | onboarding, billing, lifecycle | 3 |
| 10 — Checklists | fase-0 | 1 |

**Total de archivos: 44**
