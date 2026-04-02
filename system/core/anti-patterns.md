# Anti-Patterns — KitDigital.AR

## Propósito

Este archivo define lo que está prohibido en el sistema.

Todo lo que aparece aquí es un error de diseño conocido con consecuencias reales.
Si se detecta alguno durante el desarrollo, se detiene y se corrige antes de continuar.

No son sugerencias. Son reglas.

---

## AP-01 — Lógica de negocio fuera de módulos

**Prohibido:** implementar lógica de negocio directamente en API routes, controllers, o componentes de frontend sin que esté encapsulada en el módulo correspondiente.

**Por qué:** la lógica fuera de módulos no puede ser validada, reutilizada ni auditada de forma consistente. Genera duplicación inmediata.

**Correcto:** toda lógica de negocio vive en el módulo propietario y se expone vía actions.

---

## AP-02 — Actions sin validar módulo activo

**Prohibido:** ejecutar una action que depende de un módulo sin verificar primero que ese módulo está activo para la tienda.

**Por qué:** una tienda sin el módulo activado no debe poder ejecutar sus acciones, independientemente de cómo llegó la solicitud.

**Correcto:** el executor verifica `store.modules[module_name] === true` antes de ejecutar. Ver `/system/backend/execution-model.md`.

---

## AP-03 — Actions sin validar límites del plan

**Prohibido:** ejecutar una action que puede exceder un límite del plan sin verificarlo primero.

**Por qué:** los límites son parte del modelo de negocio y de la protección de infraestructura. Ignorarlos rompe ambos.

**Correcto:** el executor verifica límites antes de ejecutar. El módulo declara qué límite aplica.

---

## AP-04 — IA ejecutando acciones directamente

**Prohibido:** que la IA llame directamente a funciones de base de datos, llame directamente actions de módulos, o modifique estado sin pasar por el executor.

**Por qué:** la IA puede alucinar, proponer acciones inválidas o inconsistentes. Sin el executor como intermediario, el sistema queda expuesto.

**Correcto:** la IA produce un JSON `{ action, data }`. El executor recibe ese JSON, aplica todas las validaciones del contrato y decide si ejecutar.

→ Ver `/system/ai/execution.md`

---

## AP-05 — Query sin store_id

**Prohibido:** ejecutar una consulta sobre entidades de dominio sin incluir el filtro `store_id = currentStoreId`.

**Por qué:** sin este filtro, una tienda puede acceder a datos de otra tienda. Esto rompe la seguridad del sistema multi-tenant.

**Correcto:** toda query de dominio lleva `WHERE store_id = currentStoreId`. El `currentStoreId` se resuelve en servidor antes de la query.

---

## AP-06 — Definir tablas fuera del schema canónico

**Prohibido:** crear tablas, columnas o estructuras de datos que no estén declaradas en `/system/database/schema.md`.

**Por qué:** el schema es la fuente de verdad de los datos. Una tabla no declarada no existe en el sistema desde el punto de vista del diseño.

**Correcto:** si un módulo necesita una nueva estructura de datos, primero se declara en su sección `Data Impact`, luego se actualiza `schema.md`, y recién entonces se implementa.

---

## AP-07 — Un módulo escribe en tablas de otro módulo

**Prohibido:** que un módulo ejecute writes (INSERT, UPDATE, DELETE) directamente sobre entidades que le pertenecen a otro módulo.

**Por qué:** viola el boundary de ownership. Genera acoplamiento implícito y hace imposible auditar quién modifica qué.

**Correcto:** si el módulo A necesita modificar datos del módulo B, llama a una action pública de B. B ejecuta el write en sus propias tablas.

---

## AP-08 — Duplicación de componentes UI

**Prohibido:** crear un componente visual que ya existe en el design system con otro nombre o en otro archivo.

**Por qué:** genera inconsistencia visual, doble mantenimiento y drift entre la Master UI Page y el sistema real.

**Correcto:** si el componente necesario no existe, se agrega al design system primero y se renderiza en la Master UI Page. Recién entonces se usa.

→ Ver `/system/design/components.md`

---

## AP-09 — Lógica de negocio en el frontend

**Prohibido:** implementar validaciones de negocio, cálculos de precios, verificaciones de módulos o reglas de lifecycle en componentes de React o en el cliente.

**Por qué:** el frontend no es confiable. Cualquier validación solo en el cliente puede ser bypasseada. Además genera duplicación con el backend.

**Correcto:** toda validación de negocio vive en el executor del backend. El frontend puede hacer validación de UX (formularios), pero no validación de negocio.

---

## AP-10 — Romper el lifecycle de tienda

**Prohibido:** mover una tienda a un estado inválido, hacer transiciones no permitidas, o ignorar el estado actual al ejecutar operaciones.

**Transiciones inválidas:**
- `archived` → cualquier estado sin intervención de superadmin
- `suspended` → `active` sin intervención de superadmin
- `demo` → `active` sin pago confirmado
- Cualquier estado → `demo` (la demo es solo el estado inicial)

**Por qué:** el lifecycle es la base del modelo de negocio. Romperlo genera tiendas activas sin pago, o pagos sin tienda activa.

**Correcto:** las transiciones de estado se ejecutan solo desde los flows definidos en `/system/flows/lifecycle.md` y `/system/flows/billing.md`.

---

## AP-11 — Hardcodear store_id o cualquier ID en código

**Prohibido:** poner UUIDs, IDs o identificadores específicos de tiendas, usuarios o entidades directamente en el código fuente.

**Por qué:** hace el sistema dependiente de datos de un entorno específico. Rompe al deployer en otro entorno.

**Correcto:** los IDs se resuelven en runtime a partir del contexto autenticado o de parámetros de request.

---

## AP-12 — Modificar eventos ya registrados

**Prohibido:** hacer UPDATE o DELETE sobre registros de la tabla `events`.

**Por qué:** los eventos son el log de auditoría del sistema. Su inmutabilidad es lo que los hace confiables para debugging, billing y compliance.

**Correcto:** si un evento fue registrado con error, se registra un nuevo evento con el estado correcto. El evento incorrecto permanece.

---

## AP-13 — Crear módulos sin declarar Data Impact

**Prohibido:** implementar un módulo sin definir completamente su sección `Data Impact` (Entities owned, Fields, Relationships, External reads).

**Por qué:** sin Data Impact declarado, el schema no puede construirse correctamente y los boundaries de ownership quedan ambiguos.

**Correcto:** el módulo se completa con las 8 secciones obligatorias antes de implementar cualquier código.

---

## AP-14 — Usar JSONB para lógica crítica

**Prohibido:** almacenar en campos JSONB (`metadata`, `config`) datos que serán usados en filtros, cálculos, validaciones o reglas de negocio críticas.

**Por qué:** los queries sobre JSONB no son eficientes a escala. La lógica que depende de datos en JSONB es frágil y no tipada.

**Correcto:** los datos con lógica asociada tienen columnas propias con tipos explícitos.

---

## AP-15 — assistant.md definiendo lógica de negocio

**Prohibido:** que el módulo `assistant` (IA) defina o reimplemente lógica de negocio que ya pertenece a otro módulo.

**Por qué:** el assistant es un orquestador que invoca actions existentes. No es un módulo de negocio. Si define lógica propia, duplica y eventualmente contradice al módulo propietario.

**Correcto:** `assistant` lista las actions que puede invocar. La lógica de esas actions vive en los módulos correspondientes.

---

## AP-16 — Implementar antes de documentar

**Prohibido:** escribir código para una feature que no está completamente definida en `/system`.

**Por qué:** el código creado sin definición previa introduce suposiciones que luego se vuelven deuda técnica o contradicen el diseño formal.

**Correcto:** primero se define en `/system`, luego se implementa. Si algo no está en `/system`, no existe y no se construye.

---

## Tabla de Referencia Rápida

| ID | Anti-pattern | Consecuencia |
|----|-------------|--------------|
| AP-01 | Lógica fuera de módulos | Duplicación, imposible auditar |
| AP-02 | Action sin validar módulo | Módulos inactivos ejecutan |
| AP-03 | Action sin validar límites | Límites del plan ignorados |
| AP-04 | IA ejecuta directamente | Estado corrupto, sin validación |
| AP-05 | Query sin store_id | Fuga de datos entre tiendas |
| AP-06 | Tablas fuera del schema | Datos huérfanos, drift |
| AP-07 | Módulo escribe en otro | Acoplamiento implícito |
| AP-08 | UI duplicada | Inconsistencia visual |
| AP-09 | Lógica de negocio en frontend | Bypass de validaciones |
| AP-10 | Romper lifecycle | Billing roto, estado inválido |
| AP-11 | IDs hardcodeados | No deployable en otro entorno |
| AP-12 | Modificar eventos | Auditoría corrupta |
| AP-13 | Módulo sin Data Impact | Schema incorrecto |
| AP-14 | Lógica en JSONB | Performance y fragilidad |
| AP-15 | Assistant con lógica propia | Duplicación de dominio |
| AP-16 | Código antes de definición | Deuda técnica desde el inicio |
