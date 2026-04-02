# F1 — Producto Base · Runbook

**Objetivo:** una tienda puede crearse, cargar productos y recibir pedidos por WhatsApp.
**Criterio de completitud:** registro → crear tienda → cargar productos → vitrina → carrito → botón WhatsApp funciona end-to-end.

---

## Precondiciones

- [ ] Fase 0 completada (checklist de F0 ✅)
- [ ] `npm run build` pasa sin errores
- [ ] Variables de entorno: Supabase + Cloudinary configuradas en `.env.local`

---

## Docs a leer antes de esta fase

```
/system/flows/onboarding.md               ← flujo completo de registro y onboarding
/system/modules/catalog.md                ← action create_store, update_store_config
/system/modules/products.md               ← CRUD de productos
/system/modules/categories.md             ← CRUD de categorías
/system/modules/cart.md                   ← lógica del carrito WhatsApp
/system/architecture/multi-tenant.md      ← resolución de tienda por subdominio
```

---

## PASO 1.1 — Autenticación

**Archivos a crear:**
- `src/app/(auth)/registro/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/confirmar-email/page.tsx`
- `src/app/auth/callback/route.ts`

**Flujo:**
1. `/registro` → `supabase.auth.signUp()` → email de confirmación
2. Usuario confirma → Supabase redirige a `/auth/callback?code=...`
3. `/auth/callback` → `exchangeCodeForSession(code)` → redirect a `/crear-tienda`
4. `/login` → `supabase.auth.signInWithPassword()` → redirect a `/admin`

**Callback route** (ver template en `/dev/infra/supabase.md`):
```typescript
// src/app/auth/callback/route.ts
// Intercambiar code por sesión → redirect a /crear-tienda
```

**Validaciones Zod:**
```typescript
const registerSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  terms:    z.literal(true, { errorMap: () => ({ message: 'Debés aceptar los términos' }) }),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, 'Contraseña requerida'),
})
```

**Diseño de páginas:** formularios centrados, mobile-first, con botón de submit y link de alternativa (¿ya tenés cuenta? → login).

**Verificación:**
- Registrar un usuario de test → email de confirmación llega a la bandeja
- Confirmar email → redirección a `/crear-tienda`
- Login con ese usuario → sesión persiste al recargar

---

## PASO 1.2 — Crear tienda (onboarding)

**Archivos a crear:**
- `src/app/(admin)/crear-tienda/page.tsx`
- `src/app/(admin)/crear-tienda/actions.ts`

**Handler a registrar:**
```typescript
// src/lib/handlers/catalog/create-store.ts
registry.register({
  name:        'create_store',
  requires:    [],
  permissions: ['user'],
  limits:      undefined,
  event_type:  'store_created',
  invalidates: [],
  validate: async (input) => {
    // 1. Verificar slug único
    // 2. Verificar formato del slug (regex: /^[a-z0-9-]+$/)
    return { success: true, data: null }
  },
  execute: async (input, ctx, db) => {
    // 1. INSERT en stores con:
    //    - billing_status: 'demo'
    //    - trial_ends_at: NOW() + 14 days
    //    - modules: { catalog: true, products: true, categories: true, cart: true, orders: true }
    //    - limits: (del plan demo: max_products=10, max_orders=20, ai_tokens=0)
    // 2. INSERT en store_users con role='owner'
    return store
  },
})
```

**Agregar al middleware** la ruta `/crear-tienda` como protegida (requiere sesión).

**Validación de slug en tiempo real:**
```typescript
// Debounce de 500ms, query a Supabase:
const { count } = await supabase
  .from('stores').select('*', { count: 'exact', head: true }).eq('slug', slugValue)
// count > 0 → slug ocupado → mostrar error
```

**Post-creación:** redirect a `/admin/setup`.

**Verificación:**
- Crear tienda → aparece en Supabase table `stores`
- `store_users` tiene el usuario con `role='owner'`
- `billing_status='demo'`, `trial_ends_at` = 14 días en el futuro
- `modules` JSONB contiene los 5 módulos CORE activos

---

## PASO 1.3 — Setup guiado

**Archivo:** `src/app/(admin)/admin/setup/page.tsx`

Stepper de 4 pasos:
1. **WhatsApp** (obligatorio): número con código de país → `UPDATE stores SET whatsapp = $1`
2. **Primer producto** (usa `create_product` del Paso 1.4)
3. **Primera categoría** (usa `create_category` del Paso 1.5)
4. **Ver tienda**: mostrar URL + botones copiar/ver

Componente stepper: usar los indicadores numéricos con clases de Tailwind. Al completar paso → avanzar automáticamente o con botón "Siguiente".

**Verificación:**
- Completar los 4 pasos → redirect a `/admin`
- Se puede saltear pasos con "Omitir"
- Al finalizar: la tienda tiene `whatsapp` configurado y al menos 1 producto

---

## PASO 1.4 — Módulo Products

**Handlers a registrar** (usar template de `/dev/plantillas/handler.md`):
- `create_product` — con límite `max_products`
- `update_product`
- `delete_product`
- `toggle_product_active` (alias de `update_product` con solo `is_active`)
- `list_products`
- `get_product`

**Importar en** `src/lib/handlers/index.ts`:
```typescript
import './products/create-product'
import './products/update-product'
import './products/delete-product'
import './products/list-products'
```

**Subida de imágenes a Cloudinary:**
```typescript
// src/lib/cloudinary/upload.ts
// Ver código completo en /dev/infra/servicios.md → sección Cloudinary
export async function uploadImage(file: File, folder: string): Promise<string>
```

**Panel `/admin/products`:**
- Template: `/dev/plantillas/pagina-admin.md`
- Listado con imagen, nombre, precio (formateado con `formatPrice()`), toggle activo/inactivo
- Botón "Nuevo producto" → `ProductForm` en Drawer
- Toggle con optimistic update (ver `/dev/plantillas/query-hook.md`)
- Eliminar con `ConfirmDialog`
- Estado vacío con `EmptyState`

**Precio en el formulario:** el usuario ingresa en pesos (ej: 1500). Al guardar: multiplicar × 100 para centavos. Al mostrar: usar `formatPrice()` que divide por 100.

**Verificación:**
- Crear producto → aparece en la lista, en Supabase `products` table
- Toggle activo/inactivo → cambio inmediato en UI (optimistic), persiste al recargar
- Eliminar → confirmación → desaparece
- Límite del plan: si hay 10 productos y el plan demo tiene `max_products=10` → `create_product` retorna `LIMIT_EXCEEDED`
- Imagen subida va a Cloudinary y la URL se guarda en `products.image_url`

---

## PASO 1.5 — Módulo Categories

**Handlers:** `create_category`, `update_category`, `delete_category`, `toggle_category_active`, `list_categories`, `reorder_categories`.

**Panel `/admin/categories`:**
- Lista simple con nombre y cantidad de productos
- Inline edit de nombre (click en el nombre → input)
- Drag & drop para reordenar (instalar `@dnd-kit/core`):
  ```bash
  npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  ```
- `reorder_categories` handler actualiza `sort_order` de todas las categorías

**Verificación:**
- Crear categoría → aparece en la lista
- Drag & drop → orden persiste al recargar
- Productos pueden asignarse a categorías en el formulario de producto

---

## PASO 1.6 — Vitrina pública

**Archivos:**
- `src/app/(public)/[slug]/page.tsx` — usar template `/dev/plantillas/pagina-publica.md`
- `src/app/(public)/[slug]/layout.tsx`
- `src/components/public/PublicLayout.tsx`
- `src/components/public/ProductGrid.tsx`
- `src/components/public/ProductCard.tsx`
- `src/components/public/CategoryNav.tsx`

**Resolución de tienda en middleware:**
```typescript
// Agregar a src/middleware.ts
const hostname = request.headers.get('host') ?? ''
const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN!   // 'localhost' en dev

// En desarrollo: no hay subdominios reales, usar ruta /{slug} directamente
// En producción: subdomain resolution → ver /system/architecture/multi-tenant.md
if (hostname !== appDomain && hostname.endsWith(`.${appDomain}`)) {
  const slug = hostname.replace(`.${appDomain}`, '')
  request.headers.set('x-store-slug', slug)
}
```

**En desarrollo local:** acceder a la vitrina via `http://localhost:3000/{slug}` (no subdominio). El routing de `[slug]` en `(public)` lo maneja.

**ProductCard:** imagen, nombre, precio formateado, botón "Agregar al carrito".

**Verificación:**
- `http://localhost:3000/{tu-slug}` → muestra vitrina con productos activos
- Slug no existente → 404
- Tienda con `billing_status='suspended'` → página de tienda inactiva

---

## PASO 1.7 — Carrito y botón WhatsApp

**Archivos:**
- `src/lib/stores/cart.ts` — Zustand store del carrito
- `src/components/public/CartDrawer.tsx`
- `src/components/public/WhatsAppCartButton.tsx`
- `src/components/public/CartItem.tsx`

**Zustand store:**
```typescript
// src/lib/stores/cart.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'  // persiste en localStorage

type CartItem = {
  product_id: string
  name:       string
  price:      number   // centavos
  quantity:   number
  image_url:  string | null
}

// Implementar: addItem, removeItem, updateQuantity, clear, getTotal, getItemCount
// Usar persist middleware para que el carrito no se pierda al recargar
```

**Generación del mensaje de WhatsApp:**
```typescript
// src/lib/utils/whatsapp.ts
export function buildWhatsAppUrl(
  items: CartItem[],
  store: { name: string; whatsapp: string }
): string {
  const lines = items.map(i =>
    `• ${i.name} x${i.quantity} — ${formatPrice(i.price * i.quantity)}`
  )
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const msg = [
    `¡Hola! Quiero hacer el siguiente pedido de *${store.name}*:`,
    '',
    ...lines,
    '',
    `*Total: ${formatPrice(total)}*`,
  ].join('\n')

  const phone = store.whatsapp.replace(/\D/g, '')
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}
```

**WhatsAppCartButton:** botón flotante en la vitrina (bottom-right), muestra badge con cantidad de ítems, abre `CartDrawer`.

**CartDrawer:**
- Abre desde la derecha en desktop, desde abajo en mobile
- Lista de ítems con +/- de cantidad y eliminar
- Total del pedido
- Botón "Pedir por WhatsApp" → abre WhatsApp en nueva pestaña

**Verificación:**
- Agregar producto → badge del botón muestra cantidad
- Abrir drawer → lista de ítems correcta
- Modificar cantidad → total actualizado
- Click "Pedir por WhatsApp" → WhatsApp abre con mensaje pre-armado correcto
- Recargar página → carrito persiste (localStorage)

---

## Checklist de completitud de Fase 1

```
[ ] Registro: usuario puede registrarse y confirmar email
[ ] Login: sesión persiste entre recargas
[ ] Crear tienda: store en DB con módulos CORE activos
[ ] Setup guiado: WhatsApp + producto + categoría configurados
[ ] create_product handler: registrado y funcional con límites
[ ] /admin/products: CRUD completo con imágenes en Cloudinary
[ ] create_category handler: registrado y funcional
[ ] /admin/categories: CRUD con reordenamiento
[ ] {slug} en localhost muestra vitrina con productos activos
[ ] Tienda inexistente → 404
[ ] Carrito: agregar, modificar cantidad, eliminar
[ ] Botón WhatsApp: genera mensaje correcto
```

---

## Al finalizar esta fase

1. Actualizar `ESTADO.md`
2. Commit: `feat(fase-1): producto base completo — auth, productos, vitrina, carrito WA`
3. → Siguiente: [`/dev/fases/F2-contenido.md`](/dev/fases/F2-contenido.md)
