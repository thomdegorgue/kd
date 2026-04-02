# KitDigital.AR — Roadmap Estratégico

## Criterio de Priorización

Las fases están ordenadas por dependencia lógica, no por urgencia arbitraria.

Cada fase construye sobre la anterior.
Nada de una fase posterior se construye antes de que la fase anterior esté completa y estable.

---

## Fase 0 — Fundación

**Objetivo:** el sistema existe de forma estructurada antes de escribir lógica de negocio.

Esto incluye:
- estructura completa del proyecto definida y documentada
- design system base construido con todos los componentes necesarios
- página maestra de UI que renderiza todos los componentes en todos sus estados
- esquema de base de datos completo, con políticas de seguridad y listo para ejecutar

**Resultado esperado:** un entorno donde todo lo que se construya después tiene bases sólidas, coherentes y sin deuda técnica desde el inicio.

**Criterio de completitud:** el design system está 100% documentado y la base de datos puede ejecutarse desde cero en cualquier momento produciendo el sistema completo.

---

## Fase 1 — Producto Base

**Objetivo:** el producto central funciona de punta a punta.

Esto incluye:
- creación y gestión de tiendas
- carga y gestión de productos
- vitrina pública accesible por subdominio
- carrito funcional que genera mensaje para WhatsApp

**Resultado esperado:** un emprendedor puede crear su tienda, cargar productos y recibir pedidos por WhatsApp. El sistema es usable y tiene valor real en esta fase.

**Criterio de completitud:** una tienda puede ser creada, configurada y recibir su primer pedido sin intervención del equipo de KitDigital.

---

## Fase 2 — Gestión de Contenido

**Objetivo:** el dueño puede administrar su tienda de forma completa y autónoma.

Esto incluye:
- CMS para gestión de productos (crear, editar, eliminar, organizar)
- gestión de categorías
- configuración de apariencia de la tienda (logo, colores, información de contacto)
- gestión básica de imágenes

**Resultado esperado:** el dueño no necesita asistencia externa para operar su tienda día a día. Tiene control total sobre su catálogo y su presencia digital.

**Criterio de completitud:** el ciclo completo de creación, edición y publicación de productos funciona sin fricción desde el panel de gestión.

---

## Fase 3 — Billing y Lifecycle

**Objetivo:** el modelo de negocio está implementado y opera de forma autónoma.

Esto incluye:
- integración con Mercado Pago para pagos recurrentes
- flujo completo: demo → pago → activación → renovación
- gestión automática de vencimientos y estados
- panel de billing para el dueño
- herramientas de superadmin para gestión de estados y overrides

**Resultado esperado:** el sistema puede generar ingresos reales. Las tiendas se activan, vencen y archivan de forma automática sin intervención manual.

**Criterio de completitud:** el ciclo de vida completo de una tienda (desde demo hasta archivado) opera sin intervención del equipo de KitDigital.

---

## Fase 4 — Módulos Base

**Objetivo:** los módulos de mayor valor y mayor demanda están disponibles.

Módulos a implementar en esta fase:
- Pedidos: gestión del estado de pedidos recibidos por WhatsApp
- Stock: control de inventario por producto

Estos dos módulos son los más solicitados por negocios que superan la etapa inicial y los que mayor retención generan.

**Resultado esperado:** los negocios con mayor volumen de operación tienen herramientas para gestionar su operación sin salir del sistema.

**Criterio de completitud:** un negocio puede recibir un pedido, registrarlo, actualizarlo y descontar stock de forma coherente.

---

## Fase 5 — Performance y Estabilidad

**Objetivo:** el sistema está optimizado para escalar.

Esto incluye:
- implementación de caché para consultas frecuentes
- rate limiting para proteger la infraestructura
- optimización de consultas críticas
- monitoreo de errores y alertas
- revisión de seguridad y políticas de acceso

**Resultado esperado:** el sistema puede operar con miles de tiendas activas sin degradación de performance y con protección ante abusos.

**Criterio de completitud:** los tiempos de respuesta son consistentes bajo carga y los límites de uso están correctamente aplicados.

---

## Fase 6 — Inteligencia Artificial

**Objetivo:** la IA agrega valor real en los flujos principales del sistema.

Esto incluye:
- asistente de onboarding: genera el contenido inicial de la tienda
- asistente de contenido: genera descripciones de productos, textos de marketing
- asistente operativo: responde preguntas sobre el uso del sistema y sugiere acciones

**Resultado esperado:** el tiempo de activación de una tienda se reduce significativamente. Los usuarios sin experiencia en marketing tienen herramientas para crear contenido de calidad sin esfuerzo.

**Criterio de completitud:** el onboarding asistido por IA funciona de punta a punta y el asistente puede manejar los casos de uso principales sin errores.

---

## Módulos Futuros (Post Fase 6)

Módulos que se implementarán según demanda y priorización de negocio:

- Mayorista
- Pagos (registro de cobros)
- Finanzas (flujo de caja básico)
- Envíos
- Variantes
- Redes Sociales
- Banners

Ninguno de estos módulos se comienza antes de que la Fase 3 esté completa y el modelo de billing esté funcionando.

---

## Principio de Evolución

El sistema no evoluciona agregando complejidad arbitraria.

Evoluciona respondiendo a:
- necesidades reales de usuarios activos
- métricas de uso que indican demanda
- oportunidades de negocio validadas

Todo lo que se agrega al sistema debe poder ser respondido con: "un usuario real necesita esto para operar su negocio."

Si esa respuesta no existe, no se construye.
