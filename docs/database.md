# KitDigital.AR — Modelo de Datos Conceptual

## Principio Central

Toda entidad del sistema pertenece a una tienda.

No existe un producto, pedido, cliente, o categoría sin una tienda propietaria.
Este principio garantiza el aislamiento entre tenants y es la base de toda la lógica de datos del sistema.

---

## Entidades del Sistema

### Tienda (Store)
Es la entidad raíz. Representa un negocio dentro de KitDigital.

Contiene:
- identidad del negocio (nombre, slug, dominio)
- estado operativo (activa, demo, suspendida, archivada)
- módulos activos
- configuración de apariencia y comportamiento
- información de facturación y plan

Todo lo demás depende de esta entidad.

---

### Usuario (User)
Representa una persona con acceso al sistema.

Un usuario puede tener acceso a una o más tiendas.
La relación entre usuario y tienda define su rol dentro de esa tienda (administrador, colaborador, etc.).

El sistema también reconoce un rol global: superadmin, que tiene acceso a todas las tiendas sin restricción.

---

### Producto (Product)
Representa un artículo que la tienda ofrece a la venta.

Pertenece a una tienda.
Puede pertenecer a una o más categorías.
Tiene precio, nombre, descripción e imagen como atributos base.
Puede tener atributos extendidos según los módulos activos (variantes, stock, precio mayorista).

---

### Categoría (Category)
Agrupa productos dentro de una tienda.

Pertenece a una tienda.
Un producto puede no tener categoría o pertenecer a múltiples categorías.
Las categorías organizan la navegación en la vitrina pública.

---

### Pedido (Order)
Representa una solicitud de compra iniciada desde el carrito.

Pertenece a una tienda.
Contiene los productos seleccionados, cantidades, totales y estado.
Está asociado a un cliente.
El ciclo de vida de un pedido es gestionado por el módulo de pedidos.

---

### Cliente (Customer)
Representa una persona que compró o generó un pedido en la tienda.

Pertenece a una tienda.
Se identifica principalmente por su número de WhatsApp.
No tiene cuenta en el sistema; es un registro interno del dueño del negocio.

---

### Pago (Payment)
Registra un pago procesado o confirmado dentro del sistema.

Pertenece a una tienda.
Puede estar asociado a un pedido.
Contiene el monto, estado y referencia al procesador de pago utilizado.

---

### Evento (Event)
Registro inmutable de algo que ocurrió en el sistema.

Pertenece a una tienda.
Tiene un tipo que identifica qué sucedió (producto creado, pedido generado, pago confirmado, módulo activado).
No se modifica ni elimina. Es el historial del sistema.

---

## Cómo Se Relacionan las Entidades

La tienda es el nodo central. Todas las entidades se conectan a ella.

- una tienda tiene muchos productos
- una tienda tiene muchas categorías
- una tienda tiene muchos pedidos
- una tienda tiene muchos clientes
- una tienda tiene muchos pagos
- una tienda tiene muchos eventos
- una tienda tiene muchos usuarios (vía relación de acceso)

Los productos se relacionan con categorías.
Los pedidos se relacionan con clientes y productos.
Los pagos se relacionan con pedidos.
Los eventos registran acciones sobre cualquier entidad.

---

## Por Qué Existe store_id en Todas las Entidades

Es la implementación del principio de aislamiento multi-tenant.

Cada consulta al sistema incluye el identificador de la tienda activa.
Esto garantiza que ningún usuario pueda acceder, modificar o ver datos de otra tienda, incluso si comparte la misma infraestructura.

El store_id no es solo un campo técnico. Es la frontera de seguridad y propiedad de cada negocio dentro del sistema compartido.

---

## Por Qué Se Usa Flexibilidad en Ciertos Atributos

Algunas entidades tienen un campo de atributos extendidos (metadata adaptable).

La razón:

- distintos módulos agregan atributos distintos a las mismas entidades
- forzar una estructura rígida para cada posible combinación de módulos haría el sistema frágil y difícil de evolucionar
- la flexibilidad permite que un módulo extienda una entidad sin romper la estructura base

Este mecanismo se usa con criterio: solo para atributos que varían por contexto o módulo.
La lógica de negocio crítica nunca vive en campos flexibles.

---

## Qué No Forma Parte del Modelo de Datos

- no hay entidades por módulo que no estén listadas aquí
- no se crean estructuras paralelas por tienda
- no hay bases de datos separadas por tenant
- no hay tablas de configuración por módulo fuera de la tienda

Todo lo que no está definido aquí no existe en el sistema hasta que se documente formalmente.
