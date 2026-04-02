# KitDigital.AR — Modelo de Negocio

## Modelo SaaS

KitDigital opera bajo un modelo de suscripción mensual.

El cliente paga un precio recurrente para mantener su tienda activa.
Si deja de pagar, la tienda pasa a un estado restringido y eventualmente se archiva.
No hay pagos únicos ni licencias perpetuas.

Este modelo garantiza ingresos predecibles y alinea los incentivos: KitDigital solo crece si sus clientes renuevan.

---

## Ciclo de Vida Comercial de una Tienda

Toda tienda recorre este ciclo:

**Demo:** cuando se crea una tienda, entra automáticamente en período de prueba gratuito de 15 días. Durante este período tiene acceso funcional pero con límites reducidos (máximo de productos, sin dominio propio, etc.). No requiere pago para comenzar.

**Activa:** cuando el usuario realiza su primer pago, la tienda se activa completamente. Accede a todos los beneficios del plan contratado y los módulos habilitados.

**Vencida (past_due):** si el pago mensual no se procesa en la fecha correspondiente, la tienda entra en estado de gracia. El acceso se limita: no se pueden crear nuevas operaciones críticas, pero la vitrina pública puede seguir visible.

**Suspendida:** bloqueo manual por parte del equipo de KitDigital. Puede ocurrir por incumplimiento de términos, fraude u otras razones operativas. El acceso queda completamente bloqueado.

**Archivada:** estado final de tiendas que dejaron de pagar o fueron desactivadas definitivamente. Los datos se conservan pero la tienda no es accesible de forma normal.

---

## Pricing Base

El modelo de precios tiene dos capas:

**Plan base:** cubre el acceso al sistema con catálogo, carrito WhatsApp y panel de gestión. Es el precio de entrada para tener una tienda operativa.

**Módulos adicionales:** cada módulo activo suma un costo adicional al precio base. El precio final de cada tienda es dinámico: precio base + suma de módulos activos.

El precio está pensado para el mercado argentino y latinoamericano.
La referencia es que cualquier emprendedor con ingresos mínimos pueda costear el plan base.

---

## Lógica de Expansión de Precio

El modelo está diseñado para que el ingreso por cliente crezca naturalmente.

Un negocio que empieza con catálogo básico puede, con el tiempo:
- activar el módulo de pedidos cuando empieza a recibir muchos mensajes
- activar stock cuando necesita controlar inventario
- activar variantes cuando agrega tallas o colores
- activar finanzas cuando quiere tener visibilidad de sus números

Cada necesidad nueva se resuelve activando un módulo. Cada módulo activado aumenta el ingreso mensual de KitDigital.

Este modelo evita la necesidad de migrar a un plan más caro de forma arbitraria. El precio crece con el valor real recibido.

---

## Concepto de Límites

Cada tienda tiene límites según su plan.

Los límites definen cuánto puede hacer una tienda dentro del sistema:
- cuántos productos puede tener activos
- cuántos pedidos puede registrar por mes
- cuántos tokens de IA puede consumir

Los límites tienen dos propósitos:

**Protección del sistema:** evitan que una tienda consuma recursos desproporcionados en una infraestructura compartida.

**Diferenciación de planes:** permiten ofrecer planes escalonados donde un plan más alto tiene límites más altos.

Cuando una tienda alcanza un límite, el sistema le informa y le ofrece la opción de actualizar su plan.
Los límites no se aplican de forma silenciosa: el usuario siempre sabe cuándo se está acercando a su límite.

El superadmin puede modificar los límites de cualquier tienda de forma manual si el caso lo requiere.

---

## Onboarding Rápido Como Ventaja Competitiva

El tiempo desde "me registré" hasta "tengo mi tienda funcionando" es una métrica crítica.

KitDigital apunta a menos de 60 segundos para tener una tienda básica operativa.

Esto es posible porque:
- el onboarding está asistido por IA (genera nombre, descripción, primer producto)
- no hay configuración técnica requerida
- el subdominio se asigna automáticamente
- no se necesita tarjeta de crédito para empezar el período demo

Esta velocidad de activación reduce la fricción de entrada y aumenta la tasa de conversión de usuarios que prueban el producto a usuarios que pagan.

---

## Procesamiento de Pagos

Los pagos de suscripción se procesan a través de Mercado Pago.

Es la plataforma de pagos dominante en Argentina y con presencia en toda Latam.
Soporta los métodos de pago locales que el mercado objetivo usa: tarjetas, transferencias, QR, billeteras digitales.

El flujo de pago es:
1. el usuario elige su plan y módulos
2. se redirige a Mercado Pago para procesar el pago
3. Mercado Pago notifica al sistema cuando el pago se confirma
4. el sistema actualiza el estado de la tienda automáticamente

Este proceso no requiere intervención manual del equipo de KitDigital.

---

## Control Administrativo

El equipo de KitDigital tiene control total sobre cualquier aspecto comercial del sistema:

- puede activar tiendas manualmente sin pago (para pruebas, demos, socios)
- puede extender el período demo de cualquier tienda
- puede modificar los límites de cualquier plan
- puede aplicar descuentos o exenciones de pago
- puede suspender o archivar cualquier tienda

Este control existe para manejar excepciones, soporte y casos especiales sin depender de código adicional.
