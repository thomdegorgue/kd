# KitDigital.AR — Definición del Producto

## Qué Hace el Producto

KitDigital permite a cualquier negocio pequeño crear una tienda digital operativa en minutos.

El resultado es una vitrina pública con catálogo de productos, carrito de compras que deriva a WhatsApp, y un panel de gestión desde donde el dueño opera todo.

El sistema es modular: empieza simple y se expande según las necesidades del negocio.

---

## El CORE del Sistema

El núcleo del producto tiene cuatro elementos:

### Catálogo (Mi Vitrina)
La tienda tiene una página pública accesible por subdominio o dominio propio.
En ella, el cliente navega los productos organizados por categorías.
Cada producto tiene nombre, precio, descripción e imagen.
No hay login requerido para navegar.

### Carrito
El cliente agrega productos al carrito desde la vitrina pública.
El carrito no procesa pagos directamente.
Su función es armar el pedido y derivarlo a WhatsApp con el detalle completo.

### WhatsApp-first
El flujo de compra termina en WhatsApp.
El carrito genera un mensaje preformateado con los productos seleccionados y el total.
El dueño recibe ese mensaje y cierra la venta manualmente.
Este modelo refleja cómo los negocios latinoamericanos realmente operan.

### Autogestión
El dueño del negocio gestiona todo desde su panel:
- carga y edita productos
- organiza categorías
- configura su tienda (nombre, logo, colores, WhatsApp, redes)
- activa y desactiva módulos
- ve el estado de su cuenta y facturación

---

## Módulos del Sistema

Los módulos extienden el CORE. Cada uno se activa de forma independiente.
Ningún módulo es obligatorio para que el sistema base funcione.

---

### Módulo: Mayorista
Permite definir una lista de precios diferenciada para clientes mayoristas.
El dueño configura un precio alternativo por producto.
Los clientes mayoristas acceden con una clave o por una sección específica de la vitrina.

---

### Módulo: Stock
Habilita el control de inventario por producto.
El dueño define la cantidad disponible.
El sistema descuenta stock cuando se registra una venta o pedido.
Cuando el stock llega a cero, el producto se marca como sin disponibilidad.

---

### Módulo: Pagos
Permite registrar y gestionar los pagos asociados a pedidos.
No es una pasarela de pago al cliente final.
Es una herramienta para que el dueño marque pedidos como pagados, parcialmente pagados o pendientes.
Puede integrarse con métodos de pago locales como Mercado Pago para confirmación.

---

### Módulo: Pedidos
Habilita un sistema de gestión de pedidos.
Los pedidos llegan desde el carrito WhatsApp y pueden registrarse en el sistema.
El dueño puede ver, actualizar y gestionar el estado de cada pedido.
Estados posibles: pendiente, confirmado, en preparación, entregado, cancelado.

---

### Módulo: Finanzas
Permite al dueño registrar ingresos y egresos básicos de su negocio.
No es contabilidad avanzada.
Es un registro simple para tener visibilidad de flujo de caja.
Incluye resumen por período y categorías básicas de movimiento.

---

### Módulo: Envíos
Habilita la configuración de métodos de envío.
El dueño define opciones (retiro en local, envío a domicilio, envío por correo).
Cada opción puede tener un costo asociado.
El carrito incorpora el costo de envío al total antes de derivar a WhatsApp.

---

### Módulo: Redes Sociales
Permite vincular las redes sociales del negocio a la vitrina pública.
El cliente puede acceder desde la tienda a Instagram, Facebook, TikTok u otras redes configuradas.

---

### Módulo: Banners
Habilita la gestión de banners visuales en la vitrina pública.
El dueño puede cargar imágenes para destacar promociones, novedades o productos específicos.
Los banners aparecen en la portada de la vitrina.

---

### Módulo: Variantes
Permite que un producto tenga variantes: talle, color, tamaño, sabor, etc.
Cada combinación de variantes puede tener precio y stock propio.
Requiere el módulo de Stock activo para control de inventario por variante.

---

### Módulo: Asistente IA
Incorpora un asistente de inteligencia artificial dentro del panel del dueño.
El asistente puede:
- generar descripciones de productos
- sugerir precios basados en contexto
- crear contenido para redes sociales
- asistir en el onboarding
- responder preguntas sobre cómo usar el sistema

El asistente NO ejecuta acciones directamente. Propone acciones que el dueño confirma.

---

## Cómo Interactúa el Usuario con el Sistema

Existen dos tipos de usuario en el sistema:

### El Dueño del Negocio (Admin de tienda)
Accede al panel de gestión con su cuenta.
Desde ahí administra su tienda: productos, pedidos, configuración, módulos, billing.
Puede haber más de un usuario con acceso al mismo negocio con roles diferenciados.

### El Cliente Final (Comprador)
Accede a la vitrina pública sin necesidad de crear cuenta.
Navega el catálogo, arma su carrito y envía el pedido por WhatsApp.
No tiene panel propio dentro del sistema.

### El Superadmin
Tiene acceso global a todas las tiendas del sistema.
Puede crear tiendas, modificar estados, overridear billing, impersonar cualquier tienda.
Es el rol de operación interna de KitDigital.
