# Flow: Onboarding — KitDigital.AR

## Propósito

Este archivo define el flujo completo de alta de una nueva tienda: desde que un usuario visita el sitio hasta que su tienda está operativa y lista para recibir pedidos.

El onboarding es una ventaja competitiva clave. La meta es que en menos de 10 minutos el dueño tenga una tienda funcional con productos reales.

→ Módulo que gestiona la tienda: `/system/modules/catalog.md`
→ Billing post-onboarding: `/system/flows/billing.md`
→ Lifecycle de tienda: `/system/flows/lifecycle.md`

---

## Meta del Flujo

**Tiempo objetivo:** < 10 minutos desde el registro hasta la primera tienda publicada.
**Resultado esperado:** Tienda con al menos 1 producto activo, WhatsApp configurado, y vitrina accesible.

---

## Fases del Onboarding

```
FASE 1 — Registro
    │
FASE 2 — Creación de tienda
    │
FASE 3 — Setup guiado (pasos obligatorios)
    │
FASE 4 — Trial activo (demo)
    │
[Conversión: FASE 5 — Activación de plan]  ← separado en /system/flows/billing.md
```

---

## FASE 1 — Registro de usuario

**URL:** `/registro`
**Módulo backend:** Supabase Auth
**Actor:** usuario anónimo

### Pasos:

1. El usuario accede a `/registro` desde el sitio de KitDigital.
2. Completa el formulario:
   - **Email** (requerido)
   - **Contraseña** (mínimo 8 caracteres)
   - Acepta Términos y Condiciones

3. Supabase Auth crea el usuario y envía email de confirmación.
4. El usuario confirma su email (link de Supabase).
5. Al confirmar → redirect a `/crear-tienda`.

**Si el usuario ya tiene cuenta** → link a `/login` visible en la pantalla de registro.

**Componentes UI involucrados:**
- Formulario de registro (email + password + checkbox TyC)
- Mensaje de "revisá tu email"
- Página de confirmación exitosa

---

## FASE 2 — Creación de tienda

**URL:** `/crear-tienda`
**Action backend:** `create_store` (módulo `catalog`)
**Actor:** `user` (recién registrado, sin tienda aún)

### Pasos:

1. El usuario ve el formulario de creación de tienda con 3 campos:
   - **Nombre de la tienda** (requerido, max 100 chars) → ej: "Ropa de Camila"
   - **Slug / URL** (requerido, auto-sugerido desde el nombre, editable) → ej: `ropade camila` → `ropade-camila`
   - **Rubro** (opcional, selector: Indumentaria / Alimentos / Tecnología / Otros)

2. El slug se valida en tiempo real: disponible / no disponible.

3. Al enviar → `create_store` ejecuta:
   - Crea el registro en `stores` con `status: demo`, `plan: starter` (demo)
   - Crea el registro en `store_users` con `role: owner`
   - Activa los módulos del CORE: `catalog`, `products`, `categories`, `cart`, `orders`
   - Establece `trial_ends_at = hoy + 14 días`
   - Emite evento `store_created`

4. Redirect a `/admin/setup` (setup guiado).

**Validaciones de negocio:**
- Slug único en todo el sistema (case-insensitive)
- Slug: solo letras, números y guiones, entre 3 y 50 chars
- Un usuario puede tener múltiples tiendas (sin límite en Fase 0)

---

## FASE 3 — Setup guiado

**URL:** `/admin/setup`
**Actor:** `user` (owner de la tienda recién creada)

El setup guiado es una secuencia de pasos que lleva al usuario a configurar lo mínimo necesario para tener una tienda funcional. No es bloqueante: el usuario puede saltar pasos y completarlos después.

### Estructura visual:
- Stepper de progreso en la parte superior (N/4 pasos)
- Cada paso tiene: título, descripción breve, formulario o acción, botón "Siguiente" y opción "Saltar por ahora"

---

### Paso 1 — Configurar WhatsApp (OBLIGATORIO para publicar)

**Action:** `update_store_whatsapp_config` (módulo `catalog`)

**Campos:**
- Número de WhatsApp de contacto (con código de país: `+54 9 11 XXXX-XXXX`)
- Mensaje de bienvenida del pedido (pre-llenado con template, editable)

**Validación:** número de teléfono en formato válido.

**Por qué es obligatorio:** Sin WhatsApp configurado la vitrina muestra el botón "Pedir por WhatsApp" pero no funciona. Es el core del producto.

---

### Paso 2 — Agregar el primer producto

**Action:** `create_product` (módulo `products`)

**Campos del formulario simplificado:**
- Nombre del producto (requerido)
- Precio (requerido)
- Imagen (opcional, con upload a Cloudinary)
- Descripción (opcional)

El formulario es simplificado respecto al formulario completo de productos. Solo los campos más relevantes para el primer producto.

Al crear el producto → el usuario ve un preview de cómo se ve en la vitrina.

**Si el usuario salta este paso:** la vitrina muestra un estado vacío con CTA de "Agregá tu primer producto".

---

### Paso 3 — Agregar categoría (opcional)

**Action:** `create_category` (módulo `categories`)

**Campos:**
- Nombre de la categoría (requerido)

**Nota:** Si el usuario tiene solo 1-2 productos, las categorías son opcionales. Este paso está marcado como opcional desde el inicio.

---

### Paso 4 — Vista previa de la tienda

El usuario ve su tienda tal como la verían sus clientes.

- Botón "Ver mi tienda" → abre `/{slug}` en nueva pestaña
- Botón "Copiar link de mi tienda" → copia la URL al portapapeles
- Botón "Compartir por WhatsApp" → abre WhatsApp Web con el link

Este paso no ejecuta ninguna action. Es informativo y de celebración.

---

### Finalización del Setup

Al completar (o saltar) todos los pasos → redirect a `/admin` (dashboard del panel).

El setup guiado desaparece de la navegación una vez completado (o después de 7 días, lo que ocurra primero).

Una barra de "completá tu tienda" persiste en el dashboard hasta que todos los pasos estén completados, mostrando el porcentaje de completitud.

---

## FASE 4 — Trial activo (demo)

**Status de tienda:** `demo`
**Duración:** 14 días desde la creación

Durante el trial:
- La tienda está completamente funcional para el CORE
- No se requiere tarjeta de crédito
- Un banner visible en el panel indica los días restantes del trial
- A los 10 días → notificación en el panel + email invitando a activar el plan

### Límites del plan demo:
- `max_products`: 10 productos activos
- `max_orders_month`: 20 pedidos por mes
- Sin acceso a módulos adicionales (pueden ser previeweados pero no activados)

### Al vencer el trial (día 14):
- `store.status` → `past_due` (por el cron `check_trial_expiry`)
- La vitrina pública pasa a mostrar un mensaje de "tienda temporalmente inactiva"
- El panel muestra un CTA prominente de activación de plan
- El usuario tiene hasta 30 días en `past_due` antes del archivado

→ Flujo de activación de plan: `/system/flows/billing.md`

---

## Puntos de Abandono y Recuperación

| Punto de abandono | Cuándo | Acción del sistema |
|------------------|--------|-------------------|
| No confirma email | +24hs | Re-envío automático de email de confirmación |
| Confirma email pero no crea tienda | +48hs | Email recordatorio (Fase 4) |
| Crea tienda pero no configura WhatsApp | +24hs | Notificación en panel al siguiente login |
| Trial vence sin activar plan | Día 14 | `past_due` + CTA de activación |

---

## Diagrama del Flujo Completo

```
Visita /registro
        │
        ▼
Completa form (email + password + TyC)
        │
        ▼
Supabase crea usuario → email de confirmación
        │
        ▼
Usuario confirma email
        │
        ▼
/crear-tienda → create_store
        │
        │ → stores: status=demo, trial=14días
        │ → store_users: role=owner
        │ → módulos CORE activos
        │
        ▼
/admin/setup — 4 pasos
        │
        ├─[1] Configurar WhatsApp (obligatorio)
        ├─[2] Crear primer producto
        ├─[3] Crear categoría (opcional)
        └─[4] Ver tienda → link de vitrina
        │
        ▼
/admin (dashboard)
        │
        ├── Trial activo (14 días)
        │       │
        │       ├── Día 10: aviso de vencimiento
        │       └── Día 14: status → past_due
        │
        └── → /system/flows/billing.md (activación de plan)
```
