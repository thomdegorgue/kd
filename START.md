# KitDigital Admin — Plan de Refactor Integral

> Documento maestro. Un agente IA puede tomar este archivo desde cero, leer `MODULOS.md` y ejecutar todo sin contexto adicional.

---

## Contexto del proyecto

**KitDigital.ar** — SaaS multi-tenant que convierte a emprendedores argentinos de "vitrina por WhatsApp" a "e-commerce real". Multi-tenant por slug (dev) / subdominio (prod).

- **Framework:** Next.js 16 App Router + React 19 + TypeScript strict
- **DB:** Supabase (PostgreSQL + RLS). Schema fuente de verdad: `schema.sql`
- **Estilos:** Tailwind CSS + primitivos estilo shadcn en `src/components/ui/`
- **Acciones del servidor:** `src/lib/actions/*.ts` → delegan en `src/lib/executor/handlers/*.ts`
- **Hooks (TanStack Query):** `src/lib/hooks/use-*.ts`
- **Panel admin:** `src/app/(admin)/admin/` — layout raíz en `src/app/(admin)/admin/layout.tsx`
- **Shell del admin:** `src/components/admin/admin-shell.tsx` (topbar + sidebar + nav)
- **Catálogo público:** `src/app/(public)/[slug]/` — context: `src/components/public/store-context.tsx`
- **Carrito público:** `src/lib/stores/cart-store.ts` (Zustand persist)
- **Tipos generados:** `src/lib/types/database.ts` → `pnpm types:db`
- **Moneda:** centavos en DB. La UI usa `formatPrice` de `src/lib/hooks/use-currency.ts`
- **Roles:** `owner`, `admin`, `collaborator` (en `store_users`). `superadmin` global.
- **Módulos:** flags en `stores.modules JSONB`. Tipo: `ModuleName` en `src/lib/types/index.ts`.

---

## Conceptos redefinidos (importante leer antes de ejecutar)

### Módulo "Pagos" → "Métodos de pago"
El módulo de pagos **no es un historial** de transacciones. Es el configurador de métodos de cobro para el checkout online. El historial de pagos por pedido se ve dentro de cada orden en `OrderSheet`.

### Módulo "Ahorros" → "Cuentas de clientes"
No son ahorros del negocio. Son **cuentas corrientes de clientes** (fiado, saldo pendiente). Se unifican con el módulo Clientes (los clientes pueden tener una cuenta corriente vinculada).

### Módulo "Módulos" → eliminado
Sus funciones se consolidan dentro de "Suscripción" (ex-Billing) como una nueva pestaña.

### Módulo "Billing" → "Suscripción"
Centraliza todo: plan activo, gestión de módulos (packs), historial de pagos de suscripción.

### Separación de dominios de pago (OBLIGATORIO)
Hay **dos sistemas de pagos completamente separados**:

- **Suscripción de la plataforma (creador de tienda → KitDigital)**: se registra en `billing_payments` y se procesa con credenciales globales (`MP_ACCESS_TOKEN`) vía el webhook `src/app/api/webhooks/mercadopago/route.ts`.
- **Pagos de pedidos e-commerce (cliente de tienda → tienda)**: se registra en `payments` (tabla de pagos de pedidos, ligada a `orders`) y se procesa con credenciales **por tienda** guardadas en `payment_methods.config` vía el webhook `src/app/api/webhooks/mercadopago/orders/route.ts`.

Regla absoluta: **nunca mezclar** `billing_payments` con `payments`.

### Nuevo flujo: Checkout e-commerce
Cuando al menos un método de pago está activo, el catálogo público ofrece checkout real (en vez de solo WhatsApp). El cliente pasa por un formulario multi-paso: carrito → datos → entrega → pago → confirmación.

---

## Convenciones de diseño

### Sheet (panel lateral) — patrón estándar
El `product-sheet` es el referente "perfecto". **Todo sheet del admin debe seguir este patrón:**

```tsx
<SheetContent className="flex flex-col gap-0 p-0">
  <SheetHeader className="flex flex-col gap-0.5 p-4 px-6 pt-6 pb-4 border-b shrink-0">
    <SheetTitle>...</SheetTitle>
    {/* tabs opcionales aquí */}
  </SheetHeader>

  {/* área scrollable */}
  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
    {/* campos del formulario */}
  </div>

  {/* footer fijo */}
  <div className="px-6 py-4 border-t shrink-0 flex gap-2">
    <Button variant="outline" className="flex-1">Cancelar</Button>
    <Button type="submit" className="flex-1">Guardar</Button>
  </div>
</SheetContent>
```

Reglas:
- `SheetContent` siempre `flex flex-col gap-0 p-0`
- Header con `border-b shrink-0`
- Contenido con `flex-1 overflow-y-auto`
- Footer con `border-t shrink-0`
- Campos: `space-y-1.5` por campo (label + input)
- Inputs: `h-8` (compacto), excepto textarea

### Spacing de módulos
Estructura estándar de una página de módulo:

```tsx
<div className="space-y-6">
  {/* Header */}
  <div className="px-4 sm:px-6 pt-4">
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold leading-none">Título</h2>
          <p className="text-xs text-muted-foreground mt-1">N registros</p>
        </div>
      </div>
      <Button size="sm">...</Button>
    </div>
  </div>

  {/* Toolbar */}
  <div className="px-4 sm:px-6">
    <EntityToolbar ... />
  </div>

  {/* Contenido */}
  <div className="px-4 sm:px-6 pb-6">
    ...
  </div>
</div>
```

### Mobile-first
- Todo módulo que tenga lista/tabla debe tener:
  - `sm:hidden`: vista de cards verticales (tocables, sin scroll horizontal)
  - `hidden sm:block`: tabla desktop con `overflow-x-auto`
- Breakpoints: `sm` = 640px, `md` = 768px, `lg` = 1024px

### Filtros
**Regla absoluta:** Ningún chip/pill/botón de filtro va inline en la página. Todo filtro va dentro del sheet que abre el botón `<Filter>` del `EntityToolbar`. La única excepción son los toggles de **vista** (Kanban/Lista), que son de presentación.

---

## Cómo ejecutar este plan

1. Leer este `START.md` completo para contextualizarse
2. Abrir `MODULOS.md`
3. Ejecutar **en orden de fases** (DB primero, UI después)
4. Marcar cada ítem como `[x]` al completarlo
5. Si un cambio requiere migración de DB: aplicar en `schema.sql` → ejecutar en Supabase → `pnpm types:db`
6. Al finalizar cada fase, ejecutar `pnpm lint` y `pnpm build` para verificar

---

## Orden de ejecución (resumen)

### Fase 0 — Bug crítico (5 min)
- [X] Fix `created_by` en tasks handler → `src/lib/executor/handlers/tasks.ts`

### Fase 1 — Global: Shell y navegación
- [X] Topbar: oculto en desktop, nombre de tienda en mobile, solo icono catálogo
- [X] Nav: eliminar "Módulos", renombrar "Billing"→"Suscripción", "Pagos"→"Métodos de pago", "Ahorros"→"Cuentas"

### Fase 2 — Global: Sistema de sheets
- [X] Estandarizar todos los sheets al patrón del product-sheet

### Fase 3 — Global: Filtros inline → dentro del botón filtro
- [X] Stock, Finance, Orders, Expenses (mover chips al filter sheet)

### Fase 4 — Mobile-first
- [X] Productos: agregar vista de cards mobile

### Fase 5 — Migraciones de DB (ejecutar antes de fases 6, 7, 9)
- [X] `customer_id` en `savings_accounts`
- [X] `notes` en `customers`
- [X] source `'checkout'` en `orders`
- [X] Nueva tabla `payment_methods`
- [X] `ModuleName` += `'checkout'`
- [X] `pnpm types:db`

### Fase 6 — Clientes + Cuentas de clientes
- [X] Rediseño conceptual del módulo "Cuentas" (ex-Ahorros)
- [X] Integración en detalle del cliente (tabs Pedidos, Cuenta)

### Fase 7 — Métodos de pago + Checkout e-commerce
- [X] Reescribir `/admin/payments` como configurador de métodos
- [X] Handlers y actions para `payment_methods`
- [X] Nueva página pública `/[slug]/checkout` + success
- [X] Modificar `CartDrawer` para ofrecer checkout real
- [X] Webhook MP: distinguir suscripciones vs pagos de pedidos
- [X] `OrderSheet`: confirmar pago manual (transferencia)

### Fase 8 — Suscripción: Billing + Módulos unificados
- [x] Tab "Módulos" dentro de `BillingPanel`
- [x] Redirect de `/admin/settings/modules` → `/admin/billing`

### Fase 9 — Gastos: categorías dinámicas
- [x] Categorías en `stores.config.expense_categories`
- [x] Combobox con creación inline en el sheet de nuevo gasto

### Fase 10 — Ventas: mejoras POS
- [x] Autocomplete de cliente + sección Envío colapsable

### Fase 11 — Bugs secundarios y pulido
- [x] Banners, Finance, Shipping, Dashboard, headers

### Fase 12 — Mejoras proactivas aprobadas
- [x] Badge pedidos pendientes en sidebar
- [x] POS fiado → savings account automático (status pending + auto-select cuenta)
- [x] Filtro por cliente en Pedidos y Cuentas (toolbar + handler)
- [x] Carrito: regla de limpieza correcta (WhatsApp vs checkout)
- [x] WhatsApp siempre visible en Configuración (ya OK — no condicional)
- [x] Crear cliente desde POS sin salir
- [x] OrderSheet: tracking page pública + link copiable + botón WhatsApp

### Fase 13 — Sincronización final de schema.sql y clear.sql
> Ejecutar AL FINAL de todo, después de todas las migraciones aplicadas.
- [x] Promover `payment_methods` a definición permanente en schema.sql
- [x] Actualizar `savings_accounts` y `customers` inline con nuevas columnas
- [x] Actualizar constraint `orders.source` con `'checkout'`
- [x] Agregar índices, RLS y trigger de `payment_methods`
- [x] Actualizar comentario de cascadas en `clear.sql`
- [x] Re-ejecutar `schema.sql` completo en Supabase (verificar idempotencia)
- [x] `pnpm types:db` — regenerar tipos TypeScript
- [x] `pnpm build` — verificar sin errores

---

## Notas de DB / Schema

- **Fuente de verdad:** `schema.sql` (idempotente, re-ejecutable)
- **Tipos TypeScript:** `pnpm types:db` sobrescribe `src/lib/types/database.ts`
- **Moneda:** centavos en DB (`price INTEGER`). `× 100` al guardar, `÷ 100` en UI.
- **Migraciones nuevas:** en el bloque `DO $$ BEGIN ... END $$` al final de `schema.sql`, antes del `COMMIT`
- **RLS:** toda tabla nueva necesita sus 4 policies (SELECT, INSERT, UPDATE, DELETE) y `ENABLE ROW LEVEL SECURITY`
- **Triggers:** `update_updated_at()` ya existe. Crear trigger para toda tabla nueva que tenga `updated_at`

### Nueva tabla clave: `payment_methods`
Config JSONB por tipo:
- `transfer`: `{ alias, cbu, holder, bank? }`
- `mp`: `{ public_key, access_token }` ⚠️ sensible, marcar para encriptar en producción

### Relación nueva: `savings_accounts.customer_id → customers.id`
FK nullable. Un cliente puede tener 0 o 1 cuenta. Una cuenta puede existir sin cliente.

---

## Archivos clave de referencia

| Qué | Dónde |
|-----|-------|
| Shell del admin (topbar + nav) | `src/components/admin/admin-shell.tsx` |
| Sheet de producto (referente de diseño) | `src/components/admin/product-sheet.tsx` |
| Toolbar de filtros | `src/components/shared/entity-toolbar.tsx` |
| Handler de tareas (bug created_by) | `src/lib/executor/handlers/tasks.ts` |
| Tipos de módulo | `src/lib/types/index.ts` |
| Todos los módulos admin | `src/app/(admin)/admin/*/page.tsx` |
| Acciones servidor | `src/lib/actions/*.ts` |
| Handlers executor | `src/lib/executor/handlers/*.ts` |
| Carrito público (Zustand) | `src/lib/stores/cart-store.ts` |
| Drawer del carrito público | `src/components/public/cart-drawer.tsx` |
| Vista catálogo público | `src/app/(public)/[slug]/catalog-view.tsx` |
| BillingPanel | `src/components/admin/billing-panel.tsx` |
| ModuleToggleList | `src/components/admin/module-toggle-list.tsx` |
| Webhook MercadoPago | `src/app/api/webhooks/mercadopago/route.ts` |
| Hooks TanStack Query | `src/lib/hooks/use-*.ts` |
| Validaciones Zod | `src/lib/validations/*.ts` |
