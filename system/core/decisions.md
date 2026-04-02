# Decisions — KitDigital.AR

## Propósito

Este archivo registra las decisiones arquitectónicas y de diseño que se desvían de la regla general o que requieren justificación explícita.

No se registran aquí decisiones que simplemente siguen las reglas de `global-rules.md`.
Solo se registra lo que necesita contexto para entenderse correctamente.

**Formato de cada decisión:**
- **Contexto:** por qué se llegó a esta decisión
- **Alternativas consideradas:** qué otras opciones existían
- **Decisión:** qué se eligió
- **Justificación:** por qué esta opción sobre las demás
- **Consecuencias:** qué implica mantener esta decisión
- **Revisable en:** cuándo tiene sentido reconsiderarla

---

## DEC-001 — Monolito modular en lugar de microservicios

**Contexto:** KitDigital necesita escalar a miles de tiendas. Existe la pregunta de si microservicios son necesarios desde el inicio.

**Alternativas consideradas:**
- Microservicios desde el inicio
- Monolito sin modularidad interna
- Monolito modular (elegido)

**Decisión:** monolito modular con separación lógica de módulos, sin separación de infraestructura.

**Justificación:**
- El equipo es pequeño; la complejidad operativa de microservicios no está justificada en esta etapa
- Un monolito bien estructurado escala a los volúmenes que KitDigital alcanzará en el mediano plazo
- La modularidad interna permite separar en servicios independientes en el futuro si se justifica
- Un solo deploy, un solo repositorio, un solo punto de observabilidad

**Consecuencias:** si el sistema crece a escala muy alta y un módulo se convierte en cuello de botella, se puede extraer como servicio independiente. La estructura modular lo facilita.

**Revisable en:** cuando algún módulo específico sea responsable de más del 40% del tráfico y no pueda optimizarse con cache.

---

## DEC-002 — Aislamiento multi-tenant por store_id, no por schema de Postgres separado

**Contexto:** Postgres permite múltiples schemas por base de datos. Una opción era dar un schema propio a cada tienda.

**Alternativas consideradas:**
- Schema de Postgres separado por tienda
- Base de datos separada por tienda
- Mismo schema con aislamiento por store_id (elegido)

**Decisión:** un solo schema compartido con `store_id` en todas las tablas de dominio, respaldado por Row Level Security (RLS) de Supabase.

**Justificación:**
- Schemas separados no escalan a 10.000 tiendas (límites de Postgres y costo de gestión)
- Bases separadas multiplican el costo de infraestructura proporcionalmente al número de tiendas
- RLS de Supabase es el mecanismo de seguridad de nivel de fila diseñado exactamente para este caso
- Permite queries cruzadas para el superadmin sin complejidad adicional

**Consecuencias:** el `store_id` es un campo crítico en absolutamente todas las entidades de dominio. Si se olvida en una query, hay riesgo de fuga de datos. Los tests deben cubrir este caso.

**Revisable en:** nunca para las tiendas existentes. Si se lanza un plan enterprise, puede evaluarse schema separado para ese tier.

---

## DEC-003 — El carrito no procesa pagos propios; deriva a WhatsApp

**Contexto:** la pregunta natural era si el carrito debería tener un checkout propio con procesador de pagos.

**Alternativas consideradas:**
- Checkout propio con Mercado Pago al cliente final
- Checkout híbrido (WhatsApp + opción de pago online)
- Derivar siempre a WhatsApp (elegido)

**Decisión:** el carrito genera un mensaje preformateado y lo envía a WhatsApp. No procesa el pago del cliente final.

**Justificación:**
- Los negocios objetivo ya venden por WhatsApp; KitDigital se integra a su flujo actual, no lo reemplaza
- Un checkout propio aumenta la fricción para el comprador y requiere integración de pagos al cliente final (regulación, chargeback, etc.)
- El módulo `payments` gestiona el registro de cobros para el dueño; no es una pasarela al cliente final
- Simplicidad del MVP: el valor es la vitrina y el carrito formateado, no el procesamiento del pago

**Consecuencias:** KitDigital no procesa pagos de clientes finales. El dueño cierra la venta por WhatsApp manualmente. Esta es una limitación conocida y aceptada del producto base.

**Revisable en:** Fase 3 o posterior, si hay demanda validada de checkout propio.

---

## DEC-004 — JSONB para modules, config y billing en la tabla stores

**Contexto:** los campos `store.modules`, `store.config` y `store.billing` son dinámicos y varían entre tiendas.

**Alternativas consideradas:**
- Columnas individuales por cada módulo (50+ columnas)
- Tabla de módulos separada con filas por módulo por tienda
- JSONB en la tabla stores (elegido)

**Decisión:** JSONB para `modules`, `config` y `billing` en `stores`.

**Justificación:**
- La cantidad de módulos puede crecer; una columna por módulo escala mal
- Una tabla separada requeriría joins en cada resolución de tienda
- JSONB en este caso es para configuración/estado, no para lógica crítica que requiera filtros complejos
- El acceso a `store.modules` siempre es sobre la tienda ya resuelta, no sobre consultas cruzadas

**Consecuencias:** no se pueden hacer queries eficientes del tipo "dame todas las tiendas con el módulo X activo" a escala. Para eso existe el sistema de eventos y el panel de superadmin con queries indexadas.

**Revisable en:** si se necesitan queries de BI sobre activación de módulos a escala, se agrega una tabla materializada.

---

## DEC-005 — La IA no ejecuta directamente; usa el executor del backend

**Contexto:** la IA podría ejecutar acciones directamente para reducir latencia.

**Alternativas consideradas:**
- IA ejecuta directamente (rechazado)
- IA genera JSON que el executor valida y ejecuta (elegido)
- IA propone, usuario confirma siempre, luego executor ejecuta

**Decisión:** la IA genera un JSON de action. El executor aplica el pipeline completo de validaciones antes de ejecutar.

**Justificación:**
- La IA puede alucinar o proponer acciones inválidas; el executor es la única línea de defensa
- Mantener el mismo pipeline para actions humanas y de IA garantiza consistencia
- En el contexto del asistente, algunas actions pueden ejecutarse sin confirmación explícita del usuario (ej: generar descripción de producto) si son de bajo riesgo; otras requieren confirmación. Esto se define en `/system/ai/actions.md`

**Consecuencias:** hay latencia adicional por la capa de validación. Aceptable dado el nivel de seguridad que provee.

**Revisable en:** nunca para el principio. La latencia se optimiza con el execution model, no bypaseando validaciones.

---

## DEC-006 — Mercado Pago como único procesador de billing

**Contexto:** existen múltiples procesadores de pago para el mercado latinoamericano.

**Alternativas consideradas:**
- Stripe (mejor API, pero menor penetración en Argentina)
- Mercado Pago (elegido)
- Soporte multi-procesador desde el inicio

**Decisión:** Mercado Pago exclusivamente en la primera versión.

**Justificación:**
- Mercado Pago es el procesador dominante en Argentina con mayor penetración en el mercado objetivo
- Soporta todos los métodos de pago locales relevantes (tarjetas, QR, billeteras)
- El soporte multi-procesador agrega complejidad que no está justificada hasta validar el modelo en un solo mercado

**Consecuencias:** si KitDigital expande a otros países de Latam, puede necesitar agregar otros procesadores.

**Revisable en:** cuando haya expansión internacional validada con usuarios reales fuera de Argentina.

---

## DEC-007 — OpenAI GPT-4o-mini como modelo de IA

**Contexto:** existen múltiples modelos de IA disponibles.

**Alternativas consideradas:**
- GPT-4o (más potente, mayor costo)
- GPT-4o-mini (elegido)
- Claude u otros modelos

**Decisión:** GPT-4o-mini para todos los casos de uso de IA en el sistema.

**Justificación:**
- El costo de GPT-4o no está justificado para los casos de uso actuales (generación de descripciones, onboarding)
- GPT-4o-mini es suficientemente capaz para texto en español en los contextos definidos
- El sistema de límites (`ai_tokens` por plan) controla el consumo

**Consecuencias:** para casos que requieran razonamiento complejo, puede necesitarse un modelo más potente. El sistema de IA está diseñado para que el modelo sea intercambiable.

**Revisable en:** si un caso de uso específico requiere calidad que GPT-4o-mini no puede proveer de forma consistente.

---

## Plantilla para nuevas decisiones

```
## DEC-XXX — Título de la decisión

**Contexto:**

**Alternativas consideradas:**
-

**Decisión:**

**Justificación:**

**Consecuencias:**

**Revisable en:**
```
