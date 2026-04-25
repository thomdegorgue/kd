# FLUJO.md — Historia de Usuario Completa

**KitDigital.ar** — Cómo funciona el sistema de punta a punta.

Este documento narra todos los flujos del sistema en lenguaje natural, sin código. Su objetivo es que cualquier persona (humano o agente IA) pueda entender qué pasa en cada momento, detectar incoherencias y evaluar el estado real del producto.

**Referencia visual del admin (POS y cierre):** el preview en `/design/admin` es la guía de UX: caja de ventas, ticket, resumen por medio, historial del día; los pedidos viven en el módulo **Pedidos**; el dinero del negocio se ve en **Finanzas** (no hay menú “Pagos” como producto aparte).

---

## ACTORES DEL SISTEMA

| Actor | Quién es | Accede a |
|-------|----------|----------|
| **Visitante** | Cualquier persona con el link del catálogo | Catálogo público `{slug}.kitdigital.ar` |
| **Comprador** | Visitante que agrega productos al carrito | Catálogo público |
| **Dueño** | El que creó la tienda y la administra | `/admin/*` |
| **Colaborador** | Usuario invitado con rol admin/colaborador | `/admin/*` (permisos limitados) |
| **Superadmin** | Operador de KitDigital | `/superadmin/*` |

---

## FLUJO 1 — REGISTRO Y ONBOARDING (DP-01, DP-02)

### 1.1 El usuario llega a la landing

El usuario visita `kitdigital.ar`. Ve:
- Propuesta de valor: "Tu catálogo digital en minutos"
- Calculadora de precio interactiva (elige cuántos productos, ve el precio mensual/anual)
- Módulos disponibles agrupados: Catálogo y Ventas, Operaciones, Equipo, etc.
- Cantidad de cupos disponibles (se actualiza en tiempo real desde la DB)
- Botón "Crear mi tienda" → lleva a `/auth/signup`

### 1.2 Registro

El usuario completa el form de signup:
- Email
- Contraseña
- Nombre completo

Al confirmar: el sistema crea el usuario en Supabase Auth. **No se crea la tienda todavía.** El usuario es redirigido a `/onboarding/store` (primer paso del wizard).

> ⚠️ **Punto crítico**: Supabase Auth puede tener email confirmation habilitado. Si está habilitado, el usuario puede continuar el onboarding pero **no puede acceder al admin** hasta confirmar el email. La pantalla de éxito del onboarding (paso 5) le explica esto.

### 1.3 Onboarding — Paso 1: Info de la tienda (`/onboarding/store`)

- Campo "Nombre de tu negocio" (obligatorio)
- El slug se auto-genera desde el nombre (slugified, único)
- El usuario puede editarlo
- Preview en tiempo real: "Tu catálogo estará en `nombre.kitdigital.ar`"
- Campo WhatsApp (con prefijo +54, obligatorio)
- Botón "Continuar →"

Al confirmar: se crea la tienda en la DB con módulos base y límites del plan. **El dueño aún no tiene acceso al panel de administración** hasta completar el pago (paso 4). No hay fase comercial “modo demo” visible: el camino es **onboarding → pago → admin activo**.

> **Nota técnica:** el esquema puede seguir usando internamente un estado transitorio en `billing_status` hasta que MP confirme (p. ej. valor legacy `demo`); en producto y documentación para el agente se trata como **“pendiente de activación tras pago”**, no como “ya estoy en el admin en demo”.
- Módulos base activados (catalog, products, categories, cart, orders, stock, **payments** como capacidad de configurar métodos de cobro al cliente y cobros en pedidos, banners, social, product_page, shipping, custom_domain)
- `limits.max_products` alineado al plan (p. ej. `trial_max_products` del plan, 100 por defecto)
- Se crea `store_users` con `role = 'owner'`

### 1.4 Onboarding — Paso 2: Diseño (`/onboarding/design`)

- Upload de logo: zona drag & drop grande. Preview inmediato.
- Color de marca: 8 swatches predefinidos + input hex libre
- Preview en tiempo real del header del catálogo (componente `MiniCatalogPreview`)
- Botón "Continuar →" (logo es opcional, color tiene default)

Al confirmar: guarda `logo_url` y `config.primary_color` en la tienda.

### 1.5 Onboarding — Paso 3: Módulos (`/onboarding/modules`)

- Grid visual de módulos opcionales con toggles
- Módulos core (siempre activos): catalog, products, categories, cart, orders — marcados con "Siempre incluido", sin toggle
- Módulos base activables: stock, payments, banners, social, product_page, shipping, custom_domain — con toggle + descripción
- Módulos pro: variants, wholesale, finance, expenses, savings_account, multiuser, tasks, assistant — se pueden seleccionar acá, se activan al pagar
- Botón "Continuar →"

Al confirmar: actualiza `stores.modules` con la selección del usuario.

### 1.6 Onboarding — Paso 4: Pago (`/onboarding/payment`) **[NUEVO — DP-01]**

- Toggle "Mensual / Anual" con badge "Ahorrás 2 meses" para el anual
- Card de plan con:
  - Precio calculado (basado en `trial_max_products = 100` productos)
  - Lista de lo que incluye (módulos base + cualquier pro seleccionado en paso 3)
  - Para anual: resumen del ahorro vs pagar 12 meses
- Botón "Ir a Mercado Pago →" (prominente, full-width en mobile)
- Texto de seguridad: "Redirigido a Mercado Pago de forma segura. Sin permanencia."

Al hacer click: crea un `CheckoutPreference` en MP con `external_reference = store_id`. Redirige a MP.

Cuando el usuario completa el pago en MP:
- MP envía webhook a `/api/webhooks/mercadopago`
- El webhook actualiza `billing_status = 'active'`
- Activa los módulos pro seleccionados (si los hay)
- Redirige al usuario de vuelta a `/onboarding/done?status=success`

### 1.7 Onboarding — Paso 5: Éxito (`/onboarding/done`)

> **Si el usuario vuelve desde Mercado Pago** (URL con `success` o similar): **no** mostrar de inmediato el confetti final. Primero ejecutar **§1.7b — Verificando pago** (polling) hasta que la tienda esté `active` en servidor; recién ahí la pantalla de éxito definitiva.

**Si el pago ya está confirmado en servidor** (`billing_status = 'active'` al cargar la página, p. ej. recarga o email ya procesado):
- Animación de éxito (check animado o confetti)
- "¡Tu tienda está lista!"
- "Enviamos un email a **{email}**. Confirmá tu cuenta para ingresar al panel."
- Botón "Reenviar email de confirmación"
- Si el email ya está confirmado → muestra botón "Ir al panel →" directamente

**Si el pago falló** (`status=error` en query param):
- "Algo salió mal con el pago"
- Botón "Reintentar" → vuelve al paso 4

**Si abandonó sin pagar** (onboarding incompleto):
- Pantalla de retoma: "Completá el pago para activar tu tienda"
- Botón "Ir a pagar" → paso 4 (`/onboarding/payment`)
- **No** se muestra el panel `/admin` completo con funciones bloqueadas; el middleware redirige al flujo de onboarding hasta que exista **pago confirmado** + (si aplica) email confirmado.

### 1.7b Vuelta de Mercado Pago — “Verificando pago” (decisión cerrada)

Tras pagar en MP, el usuario vuelve a `/onboarding/done` (o URL de retorno acordada). **El webhook puede tardar unos segundos** respecto al redirect del navegador.

**Comportamiento acordado (pro):**
1. Mostrar de inmediato una pantalla **“Verificando tu pago…”** con estado de carga premium (skeleton / spinner discreto + copy tranquilizador).
2. **Polling** al servidor cada ~2 segundos (p. ej. máximo 30 intentos ≈ 1 min) consultando `billing_status` de la tienda (o endpoint dedicado `getOnboardingPaymentStatus`).
3. Si pasa a `active` → transición animada a la pantalla de éxito definitiva (“¡Listo!”, email de confirmación, CTA al panel).
4. Si tras el máximo de intentos sigue sin `active` → mensaje honesto: “Seguimos procesando tu pago. Si ya pagaste, esperá unos minutos o contactá soporte” + botón reintentar consulta + link soporte.

### 1.8 Primer acceso al admin

El usuario confirma su email (si Auth lo exige), hace click en el link, queda logueado en Supabase Auth, y es redirigido a `/admin`. El middleware detecta:
- Usuario autenticado ✅
- `email_confirmed_at` tiene valor ✅ (si confirmación está activa)
- `billing_status = 'active'` ✅ (pago de KitDigital ya confirmado)
- `store_id` resuelto desde `store_users` ✅

Accede al panel admin **sin pasar por una fase “demo” de uso del producto**.

---

## FLUJO 2 — PANEL ADMIN: USO DIARIO DEL DUEÑO

### 2.1 Login recurrente

El dueño va a `kitdigital.ar`, hace click en "Ingresar" (o va directo a `/auth/login`). Completa email + contraseña. El middleware valida la sesión y redirige a `/admin/dashboard`.

### 2.2 Dashboard

La pantalla principal muestra:
- **4 cards métricas**: Ventas hoy ($ total) | Pedidos pendientes (count) | Productos activos | Sin stock (si módulo activo)
- **Últimos pedidos**: tabla compacta de 5 más recientes con estado + monto
- **Accesos rápidos**: botones → Nueva venta | Nuevo producto | Ver catálogo | Compartir por WhatsApp

Si la tienda está recién creada (sin ventas, sin productos): muestra un estado vacío con una checklist de primeros pasos.

### 2.3 Sección Ventas (`/admin/ventas`) — POS [NUEVO — DP-03]

Misma idea que **`/design/admin`**: caja rápida, ticket, resumen por medio de cobro, historial del día. El dueño registra una venta en persona (local, teléfono, mostrador):

1. **Busca productos**: escribe en el buscador, aparecen cards con imagen + nombre + precio + stock
2. **Agrega items**: click en una card → se suma al carrito de venta. Puede editar cantidad.
3. **Aplica descuento** (opcional): en $ o %
4. **Selecciona cliente** (opcional): busca un cliente existente por nombre/teléfono, o ingresa nombre rápido + teléfono para crear uno
5. **Elige método de cobro**: según lo **configurado en ajustes** (en principio **transferencia** y **Mercado Pago**; en POS también **efectivo** y, si aplica, **cuenta de ahorro**). No hay una sección de menú llamada “Pagos”; la configuración vive en **ajustes / métodos de cobro** (ver §2.15).
6. **Confirma la venta**: click en "Confirmar Venta"

El sistema:
- Crea `order` con `source='admin'`, `status='confirmed'`
- Crea `order_items` (snapshot de precios al momento)
- Crea `payment` con el método elegido
- Si "Cuenta de Ahorro": crea `savings_movement` de débito
- Si módulo stock activo: descuenta `products.stock`

Aparece el **Ticket de Éxito**:
- Número de pedido (#4521)
- Items y total
- Botones: [Nueva venta] [Enviar comprobante por WhatsApp] [Descargar PDF]

**Historial del día** (panel derecho): lista de ventas del día + resumen por método de pago (como cierre de caja). El detalle histórico completo y cambios de estado de pedido → **§2.5 Pedidos**.

### 2.3b Cómo encaja con Pedidos y Finanzas

| Dónde | Qué pasa |
|-------|----------|
| **Ventas (POS)** | El dueño arma la venta y confirma; se genera un **pedido** (`orders` + `order_items`) con el estado inicial acordado (p. ej. confirmado / en preparación según reglas de negocio). |
| **Pedidos** | Listado y detalle de todos los pedidos (POS, futuros MP checkout, etc.). Timeline de estado, WhatsApp al cliente, PDF. |
| **Finanzas** | Visión de ingresos/egresos del negocio; puede integrarse con ventas cobradas según módulos activos (ver `system/modules.md`). |
| **Ajustes — métodos de cobro** | Alta de **Mercado Pago** (credenciales / link) y **transferencia** (alias, CBU, notas); no es una app “Pagos” en el sidebar. |

### 2.4 Sección Productos (`/admin/products`)

Lista de todos los productos con:
- Thumbnail + nombre + categorías (badges) + precio + precio anterior (tachado) + stock badge + estado (activo/inactivo)
- Barra de búsqueda + filtros (categoría, estado, stock)
- Botón "Nuevo producto"

Click en un producto → abre el **ProductSheet** (panel lateral) con tabs:
- **Ficha**: nombre, precio, precio anterior, descripción, imagen, toggle activo/destacado
- **Categorías**: multi-select de categorías de la tienda
- **Stock**: número de unidades. Toggle "Gestionar stock". Solo si módulo `stock` activo.
- **Página**: slug, título SEO, descripción SEO. Solo si módulo `product_page` activo.
- **Variantes**: tabla de variantes. Solo si módulo `variants` activo.

El dueño guarda desde el Sheet sin salir de la lista.

### 2.5 Sección Pedidos (`/admin/orders`)

Lista de pedidos de todas las fuentes (admin/POS, WhatsApp futuro, MP automático):
- Cards en mobile, tabla en desktop
- Filtro por estado: Pendiente / En preparación / En camino / Entregado / Cancelado
- Filtro de fecha

Click en un pedido → abre **OrderSheet** (panel lateral):
- **Timeline visual** de estados: click en un estado → lo cambia
- **Items**: lista con imagen + nombre + cantidad + precio
- **Cliente**: nombre + WhatsApp (link wa.me)
- **Pago**: estado + método + monto
- **Envío**: código de tracking + botón copiar. Solo si módulo `shipping` activo.
- Botones: [WhatsApp al cliente] [Descargar PDF] [Cancelar pedido]

### 2.6 Sección Clientes (`/admin/customers`)

Lista de clientes con nombre, teléfono, cantidad de pedidos, último pedido.
Click en cliente → historial de pedidos + total gastado.

### 2.7 Sección Banners (`/admin/banners`)

Grid de cards 16:9 con imagen + título + estado. Solo si módulo `banners` activo.
Botón "Nuevo banner" → Sheet con imagen (drag & drop), título, subtítulo, link.
Reordenar con drag-and-drop.

### 2.8 Sección Categorías (`/admin/categories`)

Lista de categorías con badge (cantidad de productos). Reordenar con drag-and-drop.
Sheet para crear/editar: nombre, descripción, imagen.

### 2.9 Sección Envíos (`/admin/shipping`)

Lista de envíos en curso con estado timeline. Solo si módulo `shipping` activo.
El dueño puede ver y actualizar el tracking de cada envío.

Configuración de métodos de envío: nombre + precio (ej: "Envío local: $500", "Envío a domicilio: $1500").

### 2.10 Sección Finanzas (`/admin/finance`)

Solo si módulo `finance` activo.
Registro de entradas y salidas: descripción + monto + tipo (ingreso/egreso) + fecha.
Balance del período.

### 2.11 Sección Gastos (`/admin/expenses`)

Solo si módulo `expenses` activo.
Lista de gastos del negocio: proveedor + concepto + monto + categoría + fecha.

### 2.12 Sección Cuenta de Ahorro (`/admin/savings`)

Solo si módulo `savings_account` activo.
Lista de cuentas de ahorro del dueño con saldo actual + movimientos.
El dueño puede depositar o retirar manualmente, o el sistema descuenta automáticamente cuando paga una venta con "Cuenta de Ahorro".

### 2.13 Sección Tareas (`/admin/tasks`)

Solo si módulo `tasks` activo.
Checklist de tareas con prioridad (alta/media/baja), estado (pendiente/completada), fecha límite.

### 2.14 Asistente IA (`/admin/assistant`)

Solo si módulo `assistant` activo y `billing_status = 'active'`.

El dueño escribe en lenguaje natural lo que quiere hacer. El asistente (GPT-4o-mini) entiende y propone acciones:
- "Agregá un producto: Remera azul, $5000" → propone `create_product`
- "Cambí el estado del pedido #4521 a entregado" → propone `update_order_status`
- "Creá la categoría Invierno" → propone `create_category`

El dueño aprueba → el executor ejecuta la acción → el asistente confirma.

**Límite mensual de tokens**: muestra el uso actual vs límite (ej: "32.400 / 50.000 tokens usados este mes"). Al agotarse, muestra "Límite mensual alcanzado. Se reinicia el 1/6/2026."

### 2.15 Configuración de tienda (`/admin/settings`)

Tabs:
- **General**: nombre de la tienda, descripción corta, WhatsApp de contacto
- **Apariencia**: logo (con ImageUploader) + color primario + preview en tiempo real del header del catálogo
- **Ubicación y Horarios**: ciudad, horarios de atención (ej: "Lun–Sáb 9–18hs")
- **Redes sociales**: Instagram, Facebook, TikTok, etc. Solo si módulo `social` activo.
- **Módulos**: grid de módulos por grupo (ver 2.16)
- **Equipo**: invitar colaboradores, ver miembros. Solo si módulo `multiuser` activo.
- **Dominio custom**: configurar dominio propio (ej: `midtienda.com`), verificación DNS. Disponible en todos los planes (feature base).
- **Métodos de cobro al cliente** (parte del módulo `payments` a nivel producto): configurar principalmente **Mercado Pago** y **transferencia**; datos que verá el comprador en checkout / que usa el POS. No es una ruta `/admin/payments` en el menú.
- **Billing (KitDigital)**: ver plan actual, cambiar, historial de pagos **a KitDigital** (`/admin/billing` — distinto del cobro al cliente final).

### 2.16 Módulos (dentro de Settings)

Grid de módulos organizados en 7 grupos:
1. **Catálogo y Ventas**: catalog (core), products (core), categories (core), cart (core), orders (core), **payments** (base = *configuración de métodos de cobro al cliente* + cobros ligados a pedidos; **sin** página de menú “Pagos”), banners (base), product_page (base)
2. **Operaciones**: stock (base), shipping (base)
3. **Equipo**: multiuser (pro)
4. **Comercial**: variants (pro), wholesale (pro)
5. **Finanzas**: finance (pro), expenses (pro), savings_account (pro)
6. **Dominio**: custom_domain (**base** — sin costo adicional)
7. **IA**: assistant (pro, add-on mensual)

Cada módulo muestra: ícono + nombre + descripción breve + toggle.
- Módulos core: badge "Incluido", sin toggle
- Módulos base: toggle (pueden activar/desactivar libremente)
- Módulos pro con billing activo: toggle habilitado
- Módulos pro sin billing activo: toggle deshabilitado + "Requiere plan activo"

### 2.17 Billing (`/admin/billing`)

- **Plan actual**: mensual o anual, precio, próxima fecha de cobro
- **Módulos pro activos** y su costo adicional
- **Total mensual** calculado
- Tabs "Mensual / Anual" para cambiar de plan
- **Historial de pagos**: lista de pagos con fecha, monto, estado
- (Futuro: botón descargar factura PDF)

Si `billing_status = 'past_due'`: banner de alerta + botón "Regularizar". El admin está en modo lectura (sin poder crear/editar entidades).

---

## FLUJO 3 — CATÁLOGO PÚBLICO (EL COMPRADOR)

### 3.1 El comprador llega al catálogo

El visitante accede a `{slug}.kitdigital.ar` (o a un dominio custom verificado como `midtienda.com`).

Ve:
- **Header sticky**: logo de la tienda + nombre + ciudad/horarios (si configurados) + ícono de búsqueda + botón carrito con badge contador
- **Banners**: carrusel de imágenes si módulo `banners` activo y hay banners
- **Trust badges**: 3 cards (Envío en 24-48hs / Compra segura / Cambio sin costo) si módulo `shipping` activo
- **Filtros de categorías**: tabs/pills horizontales. "Todos" + cada categoría activa.
- **Grid de productos**: cards en 2 columnas en mobile, 3-4 en desktop

### 3.2 Explorar productos

Cada **ProductCard** muestra:
- Imagen cuadrada (hover: ligero zoom)
- Nombre del producto
- Precio (en ARS, formateado: "$1.500")
- Precio anterior tachado si hay `compare_price` (ej: "~~$2.000~~ $1.500 → 25% OFF")
- Badge "Sin stock" semitransparente sobre la imagen si `stock <= 0` (módulo stock activo)
- Badge "Quedan N" si `stock <= 5` (módulo stock activo)
- Badge "Destacado" si `is_featured`
- Botón "+" en esquina inferior derecha para agregar al carrito sin abrir el detalle

### 3.3 Filtrar por categoría

El visitante hace click en una categoría → la URL cambia a `?category=nombre` → la grilla se filtra instantáneamente (sin full reload). Los productos ya están en memoria del cliente.

Si la tienda tiene más de ~200 productos → hace fetch al servidor por categoría (paginado, 48 items).

### 3.4 Buscar productos

Click en ícono lupa en el header (o el buscador ya visible en desktop) → input aparece/se expande. El visitante escribe → la grilla se filtra en tiempo real buscando en nombre + descripción, con normalización de acentos ("cafe" encuentra "café").

### 3.5 Ver detalle de producto

Click en una card (no en el "+" rápido) → se abre el **Product Detail Sheet** desde abajo en mobile, desde el lado en desktop:
- Imagen completa (con carrusel si hay varias)
- Nombre + precio + precio anterior + badge de ahorro
- Selector de variantes si módulo `variants` activo (colores como swatches circulares, tallas como pills de texto)
- Contador de cantidad (−  N  +)
- "Solo quedan X" si stock < 5
- Descripción completa
- Botón "Agregar al carrito" (grande, color `primary_color` de la tienda)
- Botón "Pedido directo por WhatsApp" (abre WA sin pasar por carrito)

### 3.6 Carrito

Click en el ícono del carrito → se abre el **Cart Drawer** desde la derecha.

Vista inicial (**carrito**):
- Lista de items: thumbnail + nombre + variante (si aplica) + selector de cantidad (− N +) + precio
- Subtotal calculado
- Botón "Ir a pedir →" (lleva a la vista de checkout)
- Si vacío: "Aún no tenés productos. ¡Explorá el catálogo!"

### 3.7 Checkout del carrito (formulario) — [MEJORADO — DP-06]

Después de hacer click en "Ir a pedir →", el drawer muestra un **formulario inline**:

```
Nombre completo *
[_________________________________]

Tipo de entrega
○ Retiro en local
○ Envío a domicilio

Dirección (solo si eligió envío, opcional)
[_________________________________]

¿Cómo querés pagar?   (si módulo payments activo)
○ Efectivo al entregar
○ Transferencia bancaria
○ [Métodos configurados por el dueño]

Nota (opcional)
[_________________________________]

[  ← Volver al carrito  ]  [  Enviar pedido por WhatsApp  ]
```

Al hacer click en "Enviar pedido por WhatsApp":
1. Se construye el mensaje de WA con todos los datos: nombre del comprador, lista de items con cantidades y precios, subtotal, tipo de entrega, dirección (si aplica), método de pago preferido, nota.
2. Se abre `wa.me/{whatsapp_del_dueño}?text={mensaje_encodeado}`.
3. El carrito se limpia.
4. El drawer cierra.

> **El pedido NO se registra en la DB.** Solo llega el mensaje por WhatsApp al dueño. El dueño lo registra manualmente en `/admin/ventas` si quiere tenerlo en el sistema.

### 3.8 Caso especial: Pago automático con Mercado Pago

**Solo cuando:**
1. La capacidad de **métodos de cobro** (`payments` en módulos) está activa, Y
2. El dueño configuró **Mercado Pago** como método habilitado en ajustes (junto a transferencia u otros mínimos)

En este caso, en el formulario de checkout aparece la opción "Pagar ahora con Mercado Pago". Al seleccionarla y confirmar:
- Se crea un `CheckoutPreference` de MP con los items del carrito (producto, cantidad, precio)
- `external_reference` = `{store_id}:{session_id}`
- Se redirige al comprador a MP para pagar
- Cuando MP confirma el pago, el webhook lo registra como `order` con `source='mp_checkout'` en la DB
- El dueño ve la venta automáticamente en `/admin/orders` (y en el dashboard)

> **Este flujo es para implementar a futuro.** Está documentado para que el diseño actual lo soporte, pero no es parte de F15–F22.

---

## FLUJO 4 — BILLING Y SUSCRIPCIONES

### 4.1 Primera activación (onboarding)

Ver Flujos 1.6–1.7b. El dueño **paga a KitDigital** durante el onboarding antes de usar el admin. Sin pago confirmado → **sin acceso a `/admin`** (redirección al onboarding / paso de pago), no “admin en demo”.

### 4.2 Facturación mensual automática

Con plan mensual:
- MP cobra automáticamente cada mes en la fecha de inicio
- Si el pago es aprobado: webhook actualiza `billing_status = 'active'`, emite evento `payment_approved`
- Si el pago falla: webhook marca `billing_status = 'past_due'`, emite evento `payment_failed`, envía email al dueño
- El dueño puede ver el estado en `/admin/billing`

### 4.3 Facturación anual

Con plan anual:
- El dueño paga una sola vez al año (precio = precio_mensual × 10, es decir, 2 meses gratis)
- Incluye todos los módulos pro EXCEPTO `assistant`
- `stores.annual_paid_until` se actualiza a la fecha de vencimiento (+365 días)
- El cron `check-billing` verifica diariamente: si `annual_paid_until < hoy` → `billing_status = 'past_due'`
- 14 días antes del vencimiento → envía email de aviso (idempotente: solo 1 por ciclo)

### 4.4 Vencimiento y reactivación

Si el billing está en `past_due`:
- El executor bloquea todas las operaciones de escritura (no puede crear/editar entidades)
- El admin muestra un banner de alerta
- El dueño puede regularizar desde `/admin/billing`
- El catálogo público sigue visible (lectura)

Si el billing llega a `archived` (cron después de N días de `past_due`):
- El catálogo público deja de ser accesible
- Los datos se conservan en la DB

### 4.5 Asistente IA: límite mensual de tokens (DP-05)

- Cada llamada al asistente consume tokens de OpenAI
- El sistema registra el consumo en `stores.ai_tokens_used`
- El límite mensual está en `plans.ai_tokens_monthly` (default 50.000 tokens)
- El primer día de cada mes, el cron resetea `ai_tokens_used = 0`
- Si el dueño alcanza el límite antes → el asistente muestra el error y la fecha de reset

### 4.6 Superadmin puede modificar todo

El superadmin puede desde `/superadmin`:
- Ver todas las tiendas con su estado
- Overridear `billing_status` manualmente
- Activar/desactivar módulos sin restricción de billing
- Editar `limits.max_products`, `limits.max_orders`, `ai_tokens_monthly` por tienda
- Cambiar precios del plan (`price_per_100_products`, `pro_module_price`)
- Cambiar el cap global de tiendas (`max_stores_total`)
- Ver todos los eventos y logs de webhooks

---

## FLUJO 5 — MULTIUSUARIO (EQUIPO)

Solo si módulo `multiuser` activo.

### 5.1 Invitar colaborador

El dueño va a Settings → Equipo → "Invitar colaborador".
Ingresa email y elige rol (Admin / Colaborador).
El sistema crea una invitación con token y envía un email al destinatario.

> **Roles:**
> - `owner`: acceso total, puede invitar, puede cambiar billing
> - `admin`: acceso total excepto billing y invitar
> - `collaborator`: solo lectura + puede procesar pedidos

### 5.2 Aceptar invitación

El invitado recibe el email con el link `/invite/{token}`.
Si ya tiene cuenta KitDigital: acepta y queda vinculado a la tienda.
Si no tiene cuenta: va al signup, crea cuenta, y la invitación se acepta automáticamente.

El invitado ahora ve la tienda cuando accede a `/admin`.

### 5.3 Tienda múltiple para un usuario

Un usuario puede pertenecer a múltiples tiendas (como dueño o colaborador). En ese caso, al acceder a `/admin` se le muestra un selector de tienda (o la última tienda activa si hay cookie guardada).

---

## FLUJO 6 — DOMINIO CUSTOM

Disponible en todos los planes (feature base — DP-04).

### 6.1 El dueño configura su dominio

Va a Settings → Dominio.
Ingresa su dominio (ej: `midtienda.com`).
El sistema genera un **token de verificación** único.

### 6.2 El dueño configura los registros DNS

En su proveedor de dominio (GoDaddy, Namecheap, etc.) debe agregar:
1. **CNAME** con nombre `@` o `www` apuntando a `cname.kitdigital.ar` (o el CNAME que indique Vercel)
2. **TXT** con nombre `_kitdigital-verify` y valor = el token generado

### 6.3 Verificación

El dueño hace click en "Verificar dominio" en el admin.
El sistema hace un lookup DNS-over-HTTPS (Google DNS) buscando el registro TXT.
Si encuentra el token → marca `custom_domain_verified = true`.

### 6.4 Acceso por dominio custom

Una vez verificado:
- El visitante puede acceder al catálogo via `midtienda.com`
- El middleware del servidor detecta el Host header → lo busca en `stores.custom_domain` donde `custom_domain_verified = true` → cachea el resultado 5 minutos en Redis → resuelve la tienda
- Funciona igual que `{slug}.kitdigital.ar` para el visitante

---

## FLUJO 7 — PANEL SUPERADMIN

El superadmin accede a `kitdigital.ar/superadmin` con su cuenta (rol `superadmin` en la tabla `users`).

### 7.1 Dashboard superadmin

- MRR (Monthly Recurring Revenue): suma de planes activos × precio
- Tiendas activas / pendientes de activación / vencidas / archivadas (métricas alineadas a cómo guardes `billing_status` en DB)
- Conversión onboarding → activo (%)
- Eventos recientes

### 7.2 Gestión de tiendas

Lista de todas las tiendas con estado, plan, módulos, billing.
Click en una tienda → detalle:
- Cambiar `billing_status` manualmente
- Override de módulos (activar cualquier módulo sin restricción)
- Editar límites (`max_products`, `max_orders`, `ai_tokens_monthly`)

### 7.3 Gestión del plan

- Editar precio base por 100 productos
- Editar precio por módulo pro
- Editar meses de descuento anual
- Editar cap global de tiendas (`max_stores_total`)
- Editar límite mensual de tokens IA (`ai_tokens_monthly`)

### 7.4 Gestión de usuarios

- Listar usuarios
- Banear / desbanear

### 7.5 Logs y auditoría

- Tabla de eventos: todos los eventos del sistema por tienda, tipo, fecha
- Tabla de webhooks MP: cada notificación recibida con payload y resultado

---

## PUNTOS DE INTEGRACIÓN ENTRE FLUJOS

```
REGISTRO
  └─► ONBOARDING (1.3-1.6)
        ├─► PAGO MP → webhook → billing_status='active'
        └─► ADMIN (si email confirmado y billing activo)

ADMIN
  ├─► VENTAS/POS (2.3) ──────────────────────────────► crea order (source='admin')
  ├─► PRODUCTOS (2.4) ───────────────────────────────► CRUD products
  ├─► PEDIDOS (2.5) ─────────────────────────────────► ve orders de todas las fuentes
  ├─► BILLING (2.17) ────────────────────────────────► createSubscription → MP
  │      └─► MP webhook ─────────────────────────────► billing_status
  └─► ASISTENTE (2.14) ─────────────────────────────► executor (acciones permitidas)

CATÁLOGO PÚBLICO
  ├─► Comprador agrega al carrito (client-side Zustand)
  └─► Checkout drawer formulario
        └─► "Enviar por WhatsApp" ────────────────────► solo abre WA (sin DB)
              (futuro: si MP habilitado → crea order source='mp_checkout')

CRON (diario 3am ARS)
  ├─► check-billing ─────────────────────────────────► transiciones billing_status
  │      ├─► trial vencido (si aplica / legacy) → past_due
  │      ├─► anual vencido → past_due
  │      ├─► aviso 14 días antes de vencimiento → email
  │      └─► reset mensual ai_tokens si cambió el mes
  └─► clean-assistant-sessions ──────────────────────► limpia sesiones expiradas
```

---

## MÓDULOS: ESTADO Y DEPENDENCIAS

| Módulo | Tipo | Depende de | Qué habilita |
|--------|------|-----------|--------------|
| `catalog` | core | — | Página principal del catálogo |
| `products` | core | catalog | CRUD de productos |
| `categories` | core | products | Categorías, filtros |
| `cart` | core | products | Carrito (Zustand, client-side) |
| `orders` | core | — | Ver y gestionar pedidos |
| `payments` | base | orders | **Configuración** de métodos de cobro al cliente (MP, transferencia, …) + cobros asociados a **pedidos**; no implica ruta `/admin/payments` en el menú |
| `stock` | base | products | Control de inventario |
| `banners` | base | catalog | Carrusel de banners |
| `social` | base | catalog | Links de redes en footer |
| `product_page` | base | products | Páginas individuales de producto con SEO |
| `shipping` | base | orders | Métodos de envío + tracking |
| `custom_domain` | **base** | — | Dominio propio (CNAME + verificación) |
| `variants` | pro | products, stock | Variantes (color, talle, etc.) |
| `wholesale` | pro | products | Precios mayoristas por cantidad |
| `finance` | pro | — | Registro de ingresos/egresos |
| `expenses` | pro | — | Gestión de gastos del negocio |
| `savings_account` | pro | payments | Cuentas de ahorro internas |
| `multiuser` | pro | — | Equipo (invitar colaboradores) |
| `tasks` | pro | — | Checklist de tareas |
| `assistant` | pro (add-on) | orders, products | Asistente IA (GPT-4o-mini) |

---

## ESTADO DEL BILLING Y LO QUE BLOQUEA

| `billing_status` | Qué puede hacer el dueño | Catálogo público |
|-----------------|--------------------------|-----------------|
| `demo` | **Stand-by / legacy.** No es el camino del onboarding 2026. Si aparece en datos antiguos, tratar como pendiente de migración o uso solo superadmin. | Según política legacy |
| `active` | Todo habilitado según módulos. | ✅ Visible |
| `past_due` | Solo lectura. Banner de alerta. | ✅ Visible (gracia) |
| `suspended` | Solo lectura. | ✅ Visible (gracia temporal) |
| `archived` | Sin acceso al admin. | ❌ No visible |

---

## DECISIONES CERRADAS (antes “incoherencias”)

### ✅ I-05 — Demo vs admin (cerrado 2026-04-24)

**Decisión:** El **modo demo comercial** queda en **stand-by**. El camino del dueño es: **últimos pasos del onboarding → pago a KitDigital → catálogo + admin en `active`**. No se expone “ya estás en el admin pero en demo”. Si el esquema DB aún usa `demo` como valor transitorio, la UX y el middleware deben tratarlo como **pendiente de activación**, sin panel completo bloqueado.

### ✅ I-06 — Webhook más lento que el redirect de MP (cerrado 2026-04-24)

**Decisión:** Pantalla **“Verificando tu pago…”** (pro: skeleton + copy) + **polling** ~2 s, ~30 intentos; luego éxito o mensaje + reintentar / soporte. Ver **§1.7b**.

### ✅ I-08 — “Pagos” vs Ventas vs Pedidos vs Finanzas (cerrado 2026-04-24)

**Decisión:** Alineado a **`/design/admin`**:
- **Ventas** = POS (`/admin/ventas`): caja → confirma → genera **pedido** con estado coherente.
- **Pedidos** = módulo listado/detalle (`/admin/orders` o ruta equivalente).
- **Finanzas** = visión monetaria del negocio (módulo pro cuando aplique).
- **No** hay producto de menú **“Pagos”** como sección principal. Sí hay **configuración de métodos de cobro** (principalmente **Mercado Pago** + **transferencia**) dentro de **ajustes**. Los cobros al cliente van ligados al pedido / POS / OrderSheet (“Registrar cobro”), no a una app paralela.

**Implementación:** si hoy existe ruta legacy `/admin/payments`, el plan es **redirigir** a `/admin/ventas` o a **Pedidos** + documentar deprecación en `ESTADO.md` / `PLAN.md` al ejecutar F16.

---

## PENDIENTES MENORES (seguir evaluando)

### ⚠️ I-01 — Retomar onboarding si abandona en paso 1 o 2

**Situación:** La tienda puede existir sin pago completado.

**Propuesta:** Persistir `config.onboarding_step` (o equivalente) y al login redirigir al paso correcto hasta completar pago.

### ⚠️ I-02 — Ventas vs Pedidos (solo UX)

**Propuesta:** En `/admin/ventas` dejar explícito en copy: “Historial del día acá; todo el historial en **Pedidos**”.

### ⚠️ I-03 — Checkout catálogo sin métodos configurados

**Propuesta:** Ocultar bloque “¿Cómo pagás?” si no hay métodos; solo nombre + envío + nota.

### ⚠️ I-04 — Plan anual y `custom_domain` en base

**Propuesta:** Migración SQL + limpieza de flags pro duplicados en `stores.modules` si aplica (pre-lanzamiento).

### ⚠️ I-07 — `pending_pro_modules` en paso 3

**Propuesta:** Paso 3 debe persistir selección pro en `config.pending_pro_modules` para que el webhook active tras pago.

---

## PRÓXIMOS PASOS SUGERIDOS

1. Implementar **§1.7b** en código (F17) y middleware según **I-05**.
2. Implementar **F16** POS según **`/design/admin`** y deprecar `/admin/payments` si existe.
3. Ajustes de **métodos de cobro** (MP + transferencia) en settings.
4. Seguir **F15** y luego **F16 → F17 → F18** según `PLAN.md` / `ESTADO.md`.
