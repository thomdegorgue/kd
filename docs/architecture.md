# KitDigital.AR — Decisiones de Arquitectura

## Por Qué SaaS

KitDigital opera como Software as a Service porque:

- el usuario no instala nada, no mantiene servidores, no gestiona actualizaciones
- el modelo de negocio requiere ingresos recurrentes y control centralizado
- permite mejorar el sistema para todos los usuarios simultáneamente
- facilita el soporte, el monitoreo y la operación interna

Un modelo de licencia o instalación local es incompatible con el tipo de usuario objetivo: alguien que necesita que todo funcione sin intervención técnica.

---

## Por Qué Multi-Tenant

Un solo sistema sirve a miles de tiendas simultáneamente.

Esto significa:

- una sola base de código para todos los clientes
- una sola infraestructura compartida y optimizada
- aislamiento de datos garantizado: cada tienda solo ve y opera sus propios datos
- posibilidad de aplicar mejoras, correcciones y nuevas funcionalidades a todos los clientes a la vez

La alternativa (una instancia por cliente) es inescalable en costo y mantenimiento para el segmento objetivo.

El aislamiento entre tenants se garantiza a nivel de datos, no de infraestructura. Cada entidad del sistema pertenece a una tienda específica. No existe dato sin dueño.

---

## Por Qué Monolito

KitDigital es un monolito modular, no un sistema de microservicios.

Las razones:

- el equipo y el producto están en etapa temprana; la complejidad operativa de microservicios no está justificada
- un monolito bien estructurado escala perfectamente hasta volúmenes que KitDigital no alcanzará en el corto o mediano plazo
- permite mover más rápido: un solo deploy, un solo repositorio, lógica centralizada
- los módulos del sistema son internos al monolito, no servicios separados

La modularidad es conceptual y de organización de código, no de infraestructura distribuida.

---

## Por Qué Modular

El sistema base debe ser funcional para el 100% de los usuarios.

Los módulos adicionales existen porque:

- negocios distintos tienen necesidades distintas
- no todos los usuarios necesitan stock, pedidos, finanzas o variantes desde el inicio
- los módulos permiten escalar el precio según el valor real que recibe cada cliente
- activar un módulo no debe requerir reconfiguración técnica ni intervención del equipo de KitDigital

La modularidad también protege la simplicidad: quien solo necesita catálogo y carrito WhatsApp no ve ni paga por lo que no usa.

---

## Por Qué WhatsApp-First

WhatsApp es el canal de ventas dominante en Latinoamérica para negocios pequeños.

El flujo de carrito que deriva a WhatsApp no es una decisión técnica, es una decisión de producto basada en comportamiento real del mercado.

Implicancias:

- el checkout complejo no es necesario ni deseable en esta etapa
- el dueño del negocio ya opera en WhatsApp; KitDigital se integra a su flujo actual
- reduce la fricción para el comprador: no necesita crear cuenta ni ingresar datos de pago
- permite que el dueño mantenga la relación personal con el cliente, que es una ventaja competitiva de los negocios pequeños

---

## Por Qué IA Como Capa

La inteligencia artificial en KitDigital no es el producto central.

Es una capa de automatización y asistencia que existe porque:

- acelera el onboarding (generación de contenido inicial)
- reduce la fricción para usuarios sin experiencia en marketing o redacción
- agrega valor diferencial sin reemplazar la decisión del usuario

**La IA nunca ejecuta acciones directamente.**

Toda acción que la IA sugiere pasa por confirmación explícita del usuario o del sistema.
Este principio protege la integridad de los datos y la confianza del usuario en el sistema.

La IA es un asistente. El usuario es quien opera.

---

## Principios Arquitectónicos que Guían Todas las Decisiones

**Un solo lugar para cada lógica.**
Si una regla de negocio existe en un lugar, no puede duplicarse en otro. La duplicación genera inconsistencia.

**Todo es controlable desde el centro.**
El superadmin debe poder auditar, modificar o bloquear cualquier tienda o acción del sistema en cualquier momento.

**Escalabilidad desde el diseño.**
Las decisiones tomadas hoy deben funcionar con 10 tiendas y con 10.000 tiendas. Si una decisión no escala, no se toma.

**Límites explícitos.**
Todo plan tiene límites. Todo módulo tiene validación. Nada se ejecuta sin verificar que el contexto lo permite.

**Simplicidad operativa.**
El sistema debe poder ser operado y entendido por una persona. La complejidad se agrega solo cuando el problema lo exige.
