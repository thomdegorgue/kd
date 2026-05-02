# MODULOS.md — Checklist Quirúrgico por Módulo

> Leer `START.md` antes de empezar. Marcar `[x]` al completar cada ítem.
> Paths relativos a la raíz: `c:\Users\thom\Herd\kd\`

---

## FASE 0 — Bug Crítico: Tasks `created_by`

**Archivo:** `src/lib/executor/handlers/tasks.ts` — handler `create_task`

**Problema:** El `INSERT` no pasa `created_by` → NOT NULL constraint violation al crear cualquier tarea.

- [ ] En el handler `create_task`, cambiar el insert:

```ts
// ACTUAL (roto):
.insert({ ...validated, store_id: context.store_id, status: 'pending' })

// CORRECTO:
.insert({ ...validated, store_id: context.store_id, status: 'pending', created_by: context.user_id })
```

`context.user_id` viene en el `StoreContext` que recibe el executor.

---

## FASE 1 — Global: Shell y Navegación

**Archivo principal:** `src/components/admin/admin-shell.tsx`

### 1.1 Topbar: invisible en desktop

- [ ] En el `div` raíz del componente `AdminTopbar`, agregar `lg:hidden`:

```tsx
// ACTUAL:
<div className="shrink-0">
  <div className="h-11 bg-background border-b ...">

// CORRECTO:
<div className="shrink-0 lg:hidden">
  <div className="h-11 bg-background border-b ...">
```

### 1.2 Mobile topbar: mostrar nombre de la tienda (no del módulo)

- [ ] `AdminTopbar` recibe `storeName: string` en lugar de `activeLabel`
- [ ] En `AdminShell`, pasar `store?.name ?? storeContext.slug` como `storeName` a `AdminTopbar` (el hook `useStoreConfig` ya está usado en `StoreSidebarHeader` del mismo archivo — mover o duplicar el llamado)
- [ ] En el JSX de `AdminTopbar`, cambiar el `<h1>`:

```tsx
// ACTUAL:
<h1 className="text-sm font-semibold flex-1 truncate">{activeLabel}</h1>

// CORRECTO:
<h1 className="text-sm font-semibold flex-1 truncate">{storeName}</h1>
```

### 1.3 Mobile topbar: "Ver catálogo" solo icono

- [ ] Reemplazar el `<a>` del catálogo por versión solo-icono:

```tsx
// CORRECTO (dentro de AdminTopbar que ya es lg:hidden):
<a
  href={catalogUrl}
  target="_blank"
  rel="noreferrer"
  aria-label="Ver catálogo"
  className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
>
  <ExternalLink className="h-4 w-4" />
</a>
```

### 1.4 Nav: eliminar ítem "Módulos" (se unifica en Suscripción)

- [ ] En `buildNav`, eliminar del grupo CONFIGURACIÓN:

```tsx
// ELIMINAR esta línea:
{ key: 'modules', label: 'Módulos', icon: Blocks, href: '/admin/settings/modules' },
```

### 1.5 Nav: "Billing" → "Suscripción"

- [ ] En `buildNav`, grupo SUSCRIPCIÓN, cambiar label e ícono:

```tsx
// ACTUAL:
{ key: 'billing', label: 'Billing', icon: Zap, href: '/admin/billing' }

// CORRECTO:
{ key: 'billing', label: 'Suscripción', icon: CreditCard, href: '/admin/billing' }
```

- [ ] Agregar `CreditCard` a los imports de lucide-react (ya importado para payments — verificar)
- [ ] Remover `Zap` de imports si no se usa en otro lado

### 1.6 Nav: "Ahorros" → "Cuentas" (mover de FINANZAS a PRINCIPALES)

- [ ] En `buildNav`, eliminar de FINANZAS:

```tsx
// ELIMINAR de FINANZAS:
...(mod('savings_account') ? [{ key: 'savings', label: 'Ahorros', icon: PiggyBank, href: '/admin/savings' }] : []),
```

- [ ] Agregar en PRINCIPALES (después de Clientes):

```tsx
...(mod('savings_account') ? [{ key: 'savings', label: 'Cuentas', icon: Wallet, href: '/admin/savings' }] : []),
```

- [ ] Remover `PiggyBank` de imports si queda sin uso

### 1.7 Nav: "Pagos" → "Métodos de pago"

- [ ] En `buildNav`, grupo GESTIÓN, cambiar el ítem payments:

```tsx
// ACTUAL:
...(mod('payments') ? [{ key: 'payments', label: 'Pagos', icon: CreditCard, href: '/admin/payments' }] : []),

// CORRECTO:
...(mod('payments') ? [{ key: 'payments', label: 'Métodos de pago', icon: CreditCard, href: '/admin/payments' }] : []),
```

---

## FASE 2 — Global: Sistema de Sheets

**Referente:** `src/components/admin/product-sheet.tsx` — estudiar antes de tocar cualquier otro sheet.

**Patrón estándar:**
```tsx
<SheetContent className="flex flex-col gap-0 p-0">
  <SheetHeader className="flex flex-col gap-0.5 p-4 px-6 pt-6 pb-4 border-b shrink-0">
    <SheetTitle>...</SheetTitle>
    {/* tabs opcionales */}
  </SheetHeader>
  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
    {/* campos */}
  </div>
  <div className="px-6 py-4 border-t shrink-0 flex gap-2">
    <Button variant="outline" className="flex-1">Cancelar</Button>
    <Button type="submit" className="flex-1">Guardar</Button>
  </div>
</SheetContent>
```

### 2.1 Stock — Sheet "Ajustar stock"

**Archivo:** `src/app/(admin)/admin/stock/page.tsx`

- [ ] `<SheetContent>` → `className="flex flex-col gap-0 p-0"`
- [ ] `SheetHeader` → `className="flex flex-col gap-0.5 p-4 px-6 pt-6 pb-4 border-b shrink-0"`
- [ ] Preview card del producto + form → dentro de `<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">`
- [ ] Botones Cancelar/Guardar → `<div className="px-6 py-4 border-t shrink-0 flex gap-2">` con `flex-1` cada uno
- [ ] Inputs: `h-8` (no `h-10`)
- [ ] Mismo fix para sheet "Importar CSV" (mismo archivo)

### 2.2 Tasks — Sheets "Nueva tarea" y "Detalle"

**Archivo:** `src/app/(admin)/admin/tasks/page.tsx`

- [ ] Sheet "Nueva tarea": aplicar patrón estándar completo
- [ ] Sheet "Detalle de tarea": aplicar patrón estándar (contenido scrollable, botón Eliminar al pie con `border-t`)

### 2.3 Savings/Cuentas — Sheets

**Archivo:** `src/app/(admin)/admin/savings/page.tsx`

- [ ] Sheet "Nueva cuenta": patrón estándar
- [ ] Sheet "Depositar / Retirar": patrón estándar

### 2.4 Finance — Sheets "Nueva entrada" y "Detalle"

**Archivo:** `src/app/(admin)/admin/finance/page.tsx`

- [ ] Sheet "Nueva entrada": patrón estándar
- [ ] Sheet "Detalle entrada": patrón estándar (botón Eliminar al pie)

### 2.5 Expenses — Sheets

**Archivo:** `src/app/(admin)/admin/expenses/page.tsx`

- [ ] Todos los sheets: patrón estándar

### 2.6 Shipping — Sheet método de envío

**Archivo:** `src/app/(admin)/admin/shipping/page.tsx`

- [ ] Sheet crear/editar método: patrón estándar

### 2.7 Categories — Sheet categoría

**Archivo:** `src/app/(admin)/admin/categories/page.tsx`

- [ ] Sheet que envuelve `<CategoryForm>`: patrón estándar. Si `CategoryForm` tiene padding propio, quitárselo y dejarlo como cuerpo del area scrollable.

### 2.8 Banners — Sheet banner

**Archivo:** `src/app/(admin)/admin/banners/page.tsx`

- [ ] Sheet crear/editar banner: patrón estándar

---

## FASE 3 — Global: Filtros Inline → Dentro del Botón Filtro

**Regla:** Ningún chip/pill/botón de filtro de datos va inline en la página. Solo los toggles de **vista** (Kanban/Lista) pueden quedar inline porque son de presentación.

El `EntityToolbar` (`src/components/shared/entity-toolbar.tsx`) ya tiene el sheet de filtros con `filterPreset`. Cada módulo debe:
1. Quitar sus chips inline
2. Conectar `onApplyFilters` al toolbar
3. Usar los filtros del sheet para filtrar datos

### 3.1 Stock — Chips de estado

**Archivo:** `src/app/(admin)/admin/stock/page.tsx`

- [ ] Eliminar `<div className="flex gap-2 flex-wrap">` con los `filterChips` (~líneas 162–183)
- [ ] En `entity-toolbar.tsx`, en el preset `'stock'`, agregar sección de estado:

```tsx
{filterPreset === 'stock' && (
  <div className="space-y-2">
    <p className="text-xs font-medium">Estado de stock</p>
    <div className="flex flex-wrap gap-1.5">
      {([
        { id: 'all', label: 'Todos' },
        { id: 'low', label: 'Bajo stock' },
        { id: 'out', label: 'Sin stock' },
        { id: 'tracked', label: 'Con seguimiento' },
      ] as const).map((f) => (
        <button key={f.id} type="button" onClick={() => setStockStatus(f.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            stockStatus === f.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-muted-foreground border-border bg-background hover:bg-muted'
          }`}>
          {f.label}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] Agregar `stockStatus?: 'all' | 'low' | 'out' | 'tracked'` a `AppliedEntityFilters`
- [ ] Agregar `const [stockStatus, setStockStatus] = useState<...>('all')` al hook interno del toolbar
- [ ] En `buildPayload()`, incluir `stockStatus` para preset `'stock'`
- [ ] En `stock/page.tsx`, conectar `onApplyFilters` y leer `appliedFilters.stockStatus` para filtrar

### 3.2 Finance — Chips de período y tipo

**Archivo:** `src/app/(admin)/admin/finance/page.tsx`

- [ ] Eliminar el `<div>` de presets de período (Hoy, 7 días, etc.) con sus date inputs inline
- [ ] Eliminar el `<div>` de chips de tipo (Todas/Ingreso/Gasto)
- [ ] En `entity-toolbar.tsx`, el preset `'finanzas'` ya tiene `movementType` y rango de fechas — agregar shortcuts de período **encima** del rango de fechas:

```tsx
{filterPreset === 'finanzas' && (
  <>
    <div className="space-y-2">
      <p className="text-xs font-medium">Período rápido</p>
      <div className="flex flex-wrap gap-1.5">
        {(['today','7d','30d','month','year'] as const).map(preset => (
          <button key={preset} type="button" onClick={() => applyPeriodPreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ...`}>
            {PERIOD_LABELS[preset]}
          </button>
        ))}
      </div>
    </div>
    {/* rango de fechas existente */}
    ...
  </>
)}
```

- [ ] Agregar `periodPreset?: string` a `AppliedEntityFilters`
- [ ] En `finance/page.tsx`, conectar `onApplyFilters` para recibir `dateFrom`, `dateTo`, `movementType`

### 3.3 Orders — Botones de estado

**Archivo:** `src/app/(admin)/admin/orders/page.tsx`

- [ ] Eliminar `<div className="flex gap-1 flex-wrap">` con los botones de estado (~líneas 100–119)
- [ ] El preset `'pedidos'` del toolbar ya tiene `pedidosStatus` — alinear sus valores con los de `orders.status` del schema: `pending`, `confirmed`, `preparing`, `delivered`, `cancelled` (hoy el toolbar tiene valores en español no alineados)
- [ ] Conectar `onApplyFilters` en `orders/page.tsx` para pasar `status` al hook `useOrders`

### 3.4 Payments — Chips de método ELIMINADOS

**Nota:** El módulo `payments` cambia de concepto en Fase 7 (deja de ser historial de pagos). La página se reescribe completa. No aplica mover chips — se rediseña desde cero.

### 3.5 Expenses — Chips de categoría

**Archivo:** `src/app/(admin)/admin/expenses/page.tsx`

- [ ] Eliminar chips inline de categorías
- [ ] Agregar preset `'gastos'` al toolbar con las categorías dinámicas del store (ver Fase 9)
- [ ] Conectar `onApplyFilters` para filtrar por categoría

---

## FASE 4 — Mobile First: Productos

**Archivo:** `src/app/(admin)/admin/products/page.tsx`

**Problema:** Solo hay `<Table>` con `overflow-x-auto`. El nombre de producto tiene `min-w-[260px]` → scroll horizontal en mobile.

- [ ] Agregar vista de cards mobile (`sm:hidden`) antes de la tabla
- [ ] Cambiar tabla a `hidden sm:block`

**Estructura card mobile:**
```tsx
{/* Mobile: cards */}
<div className="sm:hidden divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
  {products.map((product) => {
    const p = product as { id: string; name: string; price: number; image_url: string | null; is_active: boolean; is_featured: boolean; stock?: number | null }
    return (
      <button
        key={p.id}
        className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/30 transition-colors"
        onClick={() => openEdit(p.id)}
      >
        <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0 relative">
          {p.image_url
            ? <Image src={p.image_url} alt={p.name} fill sizes="40px" className="object-cover" />
            : <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">—</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-medium truncate">{p.name}</span>
            {p.is_featured && <Star className="h-3 w-3 text-amber-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-primary">{formatPrice(p.price)}</span>
            {/* stockBadge si módulo activo */}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={p.is_active ? 'default' : 'secondary'} className="text-[10px]">
            {p.is_active ? 'Activo' : 'Oculto'}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
    )
  })}
</div>

{/* Desktop: tabla existente */}
<div className="hidden sm:block border rounded-lg overflow-x-auto">
  <Table>...</Table>
</div>
```

- [ ] En la tabla desktop, quitar `min-w-[260px]` de la columna nombre; usar `max-w-[200px] truncate` si hace falta
- [ ] Importar `Star`, `ChevronRight` si no están ya importados

- [ ] Alinear header de productos al patrón estándar (`space-y-6` con secciones separadas con `px-4 sm:px-6`)

---

## FASE 5 — Migraciones de Base de Datos

**Archivo:** `schema.sql`

Todas las migraciones nuevas van en el bloque `DO $$` de migraciones de columnas (antes del `COMMIT`).

### 5.1 Clientes: campo `notes`

```sql
IF NOT EXISTS (SELECT 1 FROM information_schema.columns
  WHERE table_name = 'customers' AND column_name = 'notes') THEN
  ALTER TABLE customers ADD COLUMN notes TEXT;
END IF;
```

### 5.2 Savings accounts: vínculo con cliente

```sql
IF NOT EXISTS (SELECT 1 FROM information_schema.columns
  WHERE table_name = 'savings_accounts' AND column_name = 'customer_id') THEN
  ALTER TABLE savings_accounts ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
END IF;
```

Índice:
```sql
CREATE INDEX IF NOT EXISTS idx_savings_accounts_customer ON savings_accounts(customer_id)
  WHERE customer_id IS NOT NULL;
```

### 5.3 Orders: nuevo source `'checkout'`

El check constraint de `source` debe incluir `'checkout'`. En Postgres no se puede modificar un check inline — hay que recrearlo.

```sql
-- Supabase soporta esto en el SQL editor; también es seguro re-ejecutar si ya existe por ser IF NOT EXISTS el enfoque
-- Primero verificar si el constraint ya incluye 'checkout':
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_source_checkout_check'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
    ALTER TABLE orders ADD CONSTRAINT orders_source_check
      CHECK (source IN ('admin', 'whatsapp', 'mp_checkout', 'checkout'));
  END IF;
END $$;
```

### 5.4 Nueva tabla: `payment_methods`

```sql
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('transfer', 'mp')),
  name TEXT NOT NULL DEFAULT '',
  instructions TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_store ON payment_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_active ON payment_methods(store_id, is_active);
```

RLS:
```sql
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_methods_select ON payment_methods FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY payment_methods_insert ON payment_methods FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY payment_methods_update ON payment_methods FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY payment_methods_delete ON payment_methods FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
```

Trigger updated_at:
```sql
-- Agregar a la lista de DROP+CREATE de triggers
CREATE TRIGGER trg_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

Config JSONB por tipo:
- **transfer:** `{ alias: string, cbu: string, holder: string, bank?: string }`
- **mp:** `{ public_key: string, access_token: string }` ⚠️ El `access_token` es sensible. En MVP se guarda en JSONB con nota de encriptar en producción real.

### 5.5 ModuleName: agregar `'checkout'`

**Archivo:** `src/lib/types/index.ts`

- [ ] Agregar `'checkout'` al union type `ModuleName`:

```ts
export type ModuleName =
  | 'catalog'
  | 'cart'
  | 'checkout'  // ← AGREGAR
  | ...
```

### 5.6 Ejecutar en Supabase y regenerar tipos

- [ ] Copiar el `schema.sql` actualizado al SQL editor de Supabase y ejecutar
- [ ] Ejecutar `pnpm types:db` para regenerar `src/lib/types/database.ts`

---

## FASE 6 — Clientes + Cuentas Unificadas (ex-Ahorros)

### 6.1 Nav renaming (ya cubierto en Fase 1.6)

### 6.2 Módulo Cuentas — Rediseño de página

**Archivo:** `src/app/(admin)/admin/savings/page.tsx`

**Concepto nuevo:** Las "cuentas de ahorro" son **cuentas corrientes de clientes** (fiado, saldo pendiente). Una cuenta puede estar vinculada a un cliente existente o no.

- [ ] Header: cambiar "Cuentas de ahorro" → "Cuentas de clientes"
- [ ] Ícono: `PiggyBank` → `Wallet`
- [ ] EmptyState: cambiar copy → "Creá cuentas para tus clientes habituales. Llevá el registro de pagos, fiado y saldo pendiente."
- [ ] Cards de cuentas: si `customer_id` presente → mostrar avatar con inicial del nombre del cliente + nombre del cliente como título (no el campo `name` genérico)
- [ ] Cambiar "Depositar" → "Registrar pago / abono" (el cliente abona)
- [ ] Cambiar "Retirar" → "Registrar cargo / fiado" (se le carga algo al cliente)
- [ ] Sheet "Nueva cuenta":
  - Campo "Cliente": buscador de clientes existentes (autocomplete, similar al de Ventas — hook `useCustomers({ search: query, pageSize: 5 })`)
  - Si se selecciona un cliente → `name` se pre-llena con el nombre del cliente y `customer_id` se guarda
  - Si no se selecciona → el campo `name` queda libre (cuenta sin cliente vinculado)
  - Eliminar campo "Meta ($)" de la UI
  - Aplicar patrón estándar de sheet
- [ ] En el handler `create_savings_account` (`src/lib/executor/handlers/savings.ts`): aceptar campo `customer_id` opcional en el insert
- [ ] En el hook `useSavingsAccounts`: asegurar que `customer_id` viene del servidor

**Validación DB:** `savings_accounts.goal_amount` puede quedar en DB pero no se usa más en la UI. No borrar para no afectar datos existentes.

### 6.3 Módulo Clientes — Integración de cuenta y pedidos

**Archivo:** `src/app/(admin)/admin/customers/page.tsx`

#### Lista de clientes

- [ ] En mobile cards: si el cliente tiene cuenta (`hasCreditAccount`), mostrar un badge `Cuenta` pequeño junto al nombre
- [ ] En tabla desktop: agregar columna "Cuenta" con el saldo si existe
- [ ] Para esto, el hook `useCustomers` debe incluir `savings_balance: number | null` en los datos (join en el handler `list_customers`)

Handler `list_customers` en `src/lib/executor/handlers/customers.ts`:
```ts
// Agregar LEFT JOIN con savings_accounts en la query:
.select(`
  *,
  savings_accounts!customer_id(id, balance)
`, { count: 'exact' })
```

#### Sheet de detalle del cliente

El `CustomerDetailSheet` actualmente tiene tabs "Datos", "Pedidos" (vacío), "Notas" (vacío).

- [ ] Tab "Datos":
  - Mantener: teléfono, email, fecha alta
  - Agregar: campo notas (editable inline si hay `notes` en DB)
  - Eliminar el link "Ver perfil completo" (la ruta `/admin/customers/[id]` solo redirige)

- [ ] Tab "Pedidos": implementar con datos reales
  - Hook: `useOrders({ customer_id: customerId, pageSize: 20 })`
  - Lista simple: `#ID corto · Estado · Total · Fecha`
  - Clickable: abre `OrderSheet` con ese order_id
  - Si 0 pedidos: texto "Sin pedidos registrados"

- [ ] Tab "Cuenta":
  - Si cliente **tiene** cuenta vinculada (`savings_account`):
    - Mostrar saldo actual con color (positivo = verde, negativo = rojo)
    - Lista de últimos movimientos (deposit = pago recibido, withdrawal = cargo/fiado)
    - Botones: "Registrar pago" / "Registrar cargo"
    - Los botones abren el sheet de movimiento de savings (reutilizar)
  - Si cliente **no tiene** cuenta:
    - Botón "Crear cuenta corriente para este cliente" → abre el sheet "Nueva cuenta" con el `customer_id` pre-cargado

- [ ] Agregar botón "Nuevo pedido" en el sheet que navega a `/admin/orders?new=1&customer_id=${id}`

- [ ] Arreglar `useCustomer(customerId)` (hook) para que devuelva también los datos de la cuenta si existe

---

## FASE 7 — Módulo Pagos: Métodos de Pago + Checkout E-commerce

Esta es la fase más grande. Transforma el módulo "Pagos" de historial de registros → sistema completo de checkout online.

### 7.1 Concepto general

**Módulo `payments` (admin):** Configurar métodos de cobro disponibles para el checkout. Puedes configurar métodos SIN activar el checkout. El checkout es opt-in, no automático.

**Flag `checkout` en `stores.modules`:** Toggle explícito "Activar pagos automáticos". El emprendedor decide cuándo dar ese salto. Mientras no lo active, el carrito sigue funcionando solo por WhatsApp.

**Tres estados posibles de la tienda:**
```
A) Sin módulo payments → solo WhatsApp (vitrina)
B) Con payments activo + checkout DESACTIVADO → puede configurar métodos, pero el carrito sigue siendo WhatsApp
C) Con payments activo + checkout ACTIVADO → el carrito ofrece ambas opciones (checkout online + WhatsApp como alternativa)
```

**Flujo cuando checkout está activo:**
```
ADMIN configura métodos de pago → activa el toggle "Activar pagos automáticos" →
CLIENTE en catálogo:
  Agrega al carrito → ve botón "Pagar online" (principal) + "Pedir por WhatsApp" (secundario) →
  "Pagar online" → /[slug]/checkout →
    Paso 1: Revisa carrito →
    Paso 2: Datos personales (nombre requerido, teléfono requerido, email opcional) →
    Paso 3: Entrega (retiro / envío con dirección si módulo shipping activo) →
    Paso 4: Método de pago (métodos activos configurados) →
    Confirmar →
      SI transfer: pantalla de confirmación con alias/CBU + instrucciones → pedido PENDIENTE
      SI mp: redirect a MP checkout → webhook actualiza orden → pantalla de éxito
ADMIN recibe pedido en /admin/orders con estado "pending" →
  SI transfer: confirma manualmente al ver el comprobante
  SI mp: se confirma automáticamente via webhook
```

**Concepto unificado de "pendiente de cobro":** El estado `pending` de un pedido y el saldo deudor de una cuenta corriente de cliente son el mismo concepto: plata que alguien debe. La lógica de confirmación de pago es reutilizada en ambos contextos (ver 7.8).

### 7.2 Admin — Página "Métodos de pago"

**Archivo:** `src/app/(admin)/admin/payments/page.tsx` — **REESCRIBIR COMPLETO**

La página actual (historial de pagos con filtros de método) se reemplaza por un configurador de métodos de pago.

**Estructura de la nueva página:**

```tsx
// Nueva página /admin/payments
'use client'

// Header
<div className="space-y-6">
  <div className="px-4 sm:px-6 pt-4">
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold leading-none">Métodos de pago</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configurá cómo tus clientes pagan al hacer un pedido online
          </p>
        </div>
      </div>
    </div>

    {/* Toggle principal: activar checkout online */}
    <div className="rounded-lg border p-4 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Activar pagos automáticos</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cuando está activo, tus clientes pueden pagar directamente en el catálogo sin pasar por WhatsApp.
          El carrito seguirá ofreciendo WhatsApp como alternativa.
        </p>
        {checkoutEnabled && !hasActiveMethod && (
          <p className="text-xs text-amber-600 mt-1 font-medium">
            Configurá al menos un método de pago para que el checkout funcione.
          </p>
        )}
      </div>
      <Switch
        checked={checkoutEnabled}
        onCheckedChange={handleToggleCheckout}
        disabled={!hasActiveMethod && !checkoutEnabled}
        // Disabled si se intenta activar sin métodos configurados
      />
    </div>
  </div>

  {/* Cards de métodos disponibles */}
  <div className="px-4 sm:px-6 space-y-4">
    {/* Transferencia bancaria */}
    <PaymentMethodCard
      type="transfer"
      title="Transferencia bancaria"
      description="El cliente ve tus datos bancarios y transfiere. Vos confirmás el pago manualmente."
      icon={<Banknote className="h-5 w-5" />}
      method={transferMethod}  // la row de payment_methods si existe
      onToggle={handleToggle}
      onConfigure={() => setEditingMethod(transferMethod)}
    />

    {/* Mercado Pago */}
    <PaymentMethodCard
      type="mp"
      title="Mercado Pago"
      description="El cliente paga directamente con Mercado Pago. El pago se confirma automáticamente."
      icon={<img src="/mp-logo.svg" ... />}  // o ícono SVG inline
      method={mpMethod}
      onToggle={handleToggle}
      onConfigure={() => setEditingMethod(mpMethod)}
    />
  </div>
</div>
```

- [ ] Crear componente `PaymentMethodCard` dentro del archivo (o como componente separado en `src/components/admin/payment-method-card.tsx`):
  - Toggle switch para activar/desactivar
  - Badge de estado (Configurado / No configurado / Activo)
  - Botón "Configurar" que abre sheet de configuración

- [ ] Sheet de configuración para **Transferencia**:
  - Campo: Alias / CBU/CVU (requerido)
  - Campo: Nombre del titular (requerido)
  - Campo: Banco (opcional)
  - Campo: Instrucciones adicionales (textarea opcional, ej: "Transferir por Mercado Pago o MODO")
  - Guardar → upsert en `payment_methods`

- [ ] Sheet de configuración para **Mercado Pago**:
  - Campo: Public Key (requerido, visible en frontend del cliente)
  - Campo: Access Token (requerido, se usa server-side para crear preferencias)
  - Nota visible: "Tu Access Token es privado. Solo lo usamos para procesar pagos."
  - Link de ayuda: "¿Dónde encontrar mis credenciales?" → link a la documentación de MP
  - Al guardar: validar que las credenciales sean válidas (llamar a MP API de test)

### 7.3 Executor handlers para payment_methods

**Archivo nuevo:** `src/lib/executor/handlers/payment-methods.ts`

```ts
// Handlers a registrar:
// list_payment_methods — listar métodos activos de la tienda
// upsert_payment_method — crear o actualizar un método
// toggle_payment_method — activar/desactivar
// delete_payment_method — eliminar

// Todos requieren módulo 'payments'
// upsert, toggle, delete requieren rol owner o admin
```

**Archivo nuevo:** `src/lib/actions/payment-methods.ts`
```ts
'use server'
export async function listPaymentMethods() { ... }
export async function upsertPaymentMethod(input) { ... }
export async function togglePaymentMethod(id: string, is_active: boolean) { ... }
export async function deletePaymentMethod(id: string) { ... }
```

**Hook nuevo:** `src/lib/hooks/use-payment-methods.ts`
```ts
export function usePaymentMethods() { ... }
export function useUpsertPaymentMethod() { ... }
export function useTogglePaymentMethod() { ... }
```

**Query keys:** Agregar `paymentMethods: (storeId: string) => [...]` en `src/lib/hooks/query-keys.ts`

### 7.4 Checkout público — Nueva página

**Ruta nueva:** `src/app/(public)/[slug]/checkout/page.tsx`

Esta es una Server Component wrapper que pasa los `payment_methods` activos y los datos del store al client component.

**Archivo nuevo:** `src/app/(public)/[slug]/checkout/checkout-view.tsx` — Client Component

**Estructura del checkout (multi-step en una sola página, scroll):**

```tsx
// Paso 1: Carrito (resumen readonly)
// Paso 2: Datos personales
//   - Nombre completo (required)
//   - Teléfono (required)
//   - Email (opcional)
// Paso 3: Entrega
//   - Radio: Retiro en tienda / Envío a domicilio
//   - Si envío: campo Dirección
// Paso 4: Método de pago
//   - Lista de métodos activos (radio buttons con logo/nombre)
// Botón: "Confirmar pedido $X.XXX"
```

En mobile: steps colapsables (accordion) o scroll lineal. En desktop: layout de 2 columnas (form izquierda + resumen derecha).

**Al confirmar:**
1. Llamar server action `createCheckoutOrder(input)`:
   - Input: `{ items, customer: {name, phone, email}, delivery: {type, address?}, payment_method_id, store_id }`
   - Crear/encontrar customer
   - Crear order (source: 'checkout', metadata: { payment_method_id, delivery_type, address, email })
   - Crear payment record (status: 'pending', method: tipo del payment_method)
   - Si MP: crear preferencia MP → retornar `{ order_id, mp_init_point }`
   - Si transfer: retornar `{ order_id, transfer_config: { alias, holder, bank } }`
   - Limpiar carrito (client-side)
2. Redirigir según método:
   - Transfer → `/[slug]/checkout/success?order=${orderId}&method=transfer`
   - MP → redirect externo a `mp_init_point`

**Página de éxito:** `src/app/(public)/[slug]/checkout/success/page.tsx`
- Si method=transfer: mostrar datos bancarios + instrucciones + número de pedido
- Si method=mp (retorno desde MP): mostrar confirmación + número de pedido
- Botón "Seguir comprando" → volver al catálogo

### 7.5 Server Action: `createCheckoutOrder`

**Archivo nuevo o en:** `src/lib/actions/checkout.ts`

```ts
'use server'

export async function createCheckoutOrder(input: CheckoutOrderInput): Promise<CheckoutOrderResult> {
  // 1. Obtener store y payment_method (public: usar supabase client anon o service role)
  // 2. Validar que la tienda tiene checkout habilitado
  // 3. Validar que el payment_method_id es válido y activo para esa tienda
  // 4. Crear/encontrar customer (buscar por phone en la tienda)
  // 5. Crear order (source: 'checkout')
  // 6. Crear payment (status: 'pending')
  // 7. Si mp: createMercadoPagoPreference(paymentMethod.config, orderTotal, orderId)
  // 8. Retornar resultado
}
```

### 7.6 CartDrawer: agregar opción checkout

**Archivo:** `src/components/public/cart-drawer.tsx`

El CartDrawer actual solo tiene el flujo WhatsApp. Cuando la tienda tiene checkout habilitado, debe ofrecer las dos opciones.

- [ ] En el step 'checkout', detectar si la tienda tiene `modules.checkout === true`
- [ ] Si checkout activo: mostrar botón "Pagar online" + mantener botón "Pedir por WhatsApp" como alternativa secundaria
- [ ] "Pagar online" → redirigir a `/[slug]/checkout` (no abrir dentro del drawer)
- [ ] El checkout en `/[slug]/checkout` toma el carrito de `useCartStore` (persisted)

```tsx
// En el step 'checkout', si hasCheckout:
<Button
  className="w-full"
  onClick={() => router.push(`/${slug}/checkout`)}
>
  Pagar online
</Button>
<button
  className="w-full text-sm text-muted-foreground hover:text-foreground mt-2 py-2"
  onClick={handleWhatsApp}
>
  Pedir por WhatsApp
</button>

// Si !hasCheckout: solo botón WhatsApp (comportamiento actual)
```

- [ ] `CatalogView` debe pasar `hasCheckout` (= `store.modules.checkout === true`) a `CartDrawer`
- [ ] En `cart-drawer.tsx`, recibir `hasCheckout?: boolean` como prop

### 7.7 Webhook MP: diferenciar suscripciones vs pagos de pedidos

**Importante:** hay 2 webhooks separados (dominios separados):

- **Suscripción (plataforma):** `src/app/api/webhooks/mercadopago/route.ts` (usa `MP_ACCESS_TOKEN` global y escribe en `billing_payments`)
- **Pedidos (tienda):** `src/app/api/webhooks/mercadopago/orders/route.ts` (usa `payment_methods.config.access_token` de la tienda y escribe en `payments` + `orders`)

El webhook actual maneja **pagos de suscripción** de la plataforma KitDigital. Los pagos de pedidos de e-commerce son un tipo diferente.

- [ ] Para pedidos, no mezclar con el webhook de billing: se procesa en `mercadopago/orders`.

**Pedidos checkout (MP):** se usa `notification_url` por preferencia apuntando a:
`/api/webhooks/mercadopago/orders?store=${storeId}`

- [ ] En la preferencia MP de pedidos, pasar `external_reference: "order:${orderId}"`
- [ ] En `mercadopago/orders`, al recibir `data.id`, obtener el payment con el access token de la tienda y:
  - Si `approved` → `payments.status='approved'` y `orders.status='confirmed'`
  - Persistir `payments.mp_payment_id`

### 7.8 Admin — Lógica unificada de "Confirmar pago"

**Concepto central:** El acto de "confirmar pago" es el mismo en tres contextos:
1. Pedido del checkout online con transferencia pendiente
2. Pedido del POS marcado como "fiado" (se cobró con cuenta corriente)
3. Cuenta corriente del cliente con saldo deudor

En todos los casos, el resultado es el mismo: `order.status → 'confirmed'` + `payment.status → 'approved'` + (si hay cuenta vinculada) `savings_account: nuevo movimiento de abono`.

**Archivo:** `src/components/admin/order-sheet.tsx`

**Sección "Cobro" del OrderSheet:**

```tsx
{/* Sección Cobro — visible en cualquier pedido */}
<div className="space-y-2">
  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cobro</p>
  <div className="rounded-lg border p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Método</span>
      <span className="text-sm font-medium">{paymentMethodLabel}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Estado</span>
      <Badge variant={payment?.status === 'approved' ? 'default' : 'secondary'}>
        {payment?.status === 'approved' ? 'Pagado' : 'Pendiente'}
      </Badge>
    </div>
    {/* Botón de confirmación — solo si el pedido está pendiente */}
    {order.status === 'pending' && payment?.status !== 'approved' && (
      <Button
        size="sm"
        className="w-full mt-1"
        onClick={() => confirmPayment(order.id)}
        disabled={confirmingPayment}
      >
        {confirmingPayment ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
        Confirmar pago recibido
      </Button>
    )}
    {/* Botón contactar por WhatsApp — si hay teléfono y el pago está pendiente */}
    {order.status === 'pending' && customer?.phone && (
      <a
        href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
          `Hola ${customer.name}, te confirmo que recibimos tu pedido #${order.id.slice(-6).toUpperCase()}. ¿Pudiste hacer el pago?`
        )}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground py-1.5 border rounded-md mt-1"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Consultar por WhatsApp
      </a>
    )}
  </div>
</div>
```

- [ ] Server action `confirmOrderPayment(orderId: string)`:
  - `orders.status = 'confirmed'`
  - `payments.status = 'approved'`
  - Si el pedido tiene `customer_id` y el cliente tiene cuenta corriente con `savings_account` vinculada **y** el método era 'fiado'/'account':
    - Registrar movimiento de abono en `savings_account_movements` (tipo: `deposit`, description: `Pago pedido #${id}`)
  - Invalidar queries: `orders`, `savings_accounts`

- [ ] Agregar botón "Contactar por WhatsApp" (link directo `wa.me`) para todos los pedidos `pending` que tengan teléfono de cliente

- [ ] En la lista de `orders/page.tsx`, los pedidos con `status = 'pending'` deben resaltarse visualmente (badge de color amber/naranja en lugar del gris actual)

- [ ] Agregar pequeño badge de **origen** en la lista de pedidos:
  - `admin` → "POS" (azul)
  - `whatsapp` → "WhatsApp" (verde)
  - `checkout` → "Online" (violeta)
  Esto da contexto al admin sin necesidad de abrir cada pedido.

- [ ] En el toolbar de pedidos (preset `'pedidos'`), agregar filtro por origen (`source`)

**Unificación con cuentas corrientes:**

- [ ] En `CustomerDetailSheet`, tab "Cuenta", la lista de movimientos debe incluir una fila especial por cada pedido que sea `source: 'account'/'fiado'` o que haya sido confirmado desde la cuenta — usando la misma query que los movimientos pero incluyendo pedidos vinculados

---

## FASE 8 — Suscripción: Unificar Billing + Módulos

### 8.1 Página Billing → Suscripción

**Archivo:** `src/app/(admin)/admin/billing/page.tsx`

- [ ] Cambiar el `<h2>` del header de "Billing" → "Suscripción"
- [ ] En el `BillingPanel` (`src/components/admin/billing-panel.tsx`), agregar tab "Módulos":

```tsx
// ACTUAL tabs en BillingPanel (si los tiene):
// Plan / Historial

// NUEVO:
<Tabs defaultValue="plan">
  <TabsList>
    <TabsTrigger value="plan">Mi plan</TabsTrigger>
    <TabsTrigger value="modulos">Módulos</TabsTrigger>
    <TabsTrigger value="historial">Historial</TabsTrigger>
  </TabsList>
  <TabsContent value="plan">
    {/* contenido actual del billing panel */}
  </TabsContent>
  <TabsContent value="modulos">
    <ModuleToggleList />  {/* componente ya existe */}
  </TabsContent>
  <TabsContent value="historial">
    {/* historial de pagos de suscripción */}
  </TabsContent>
</Tabs>
```

- [ ] Importar `ModuleToggleList` en `billing-panel.tsx`

### 8.2 Redirigir `/admin/settings/modules` → `/admin/billing`

**Archivo:** `src/app/(admin)/admin/settings/modules/page.tsx`

- [ ] Cambiar la página de módulos a un simple redirect:

```tsx
import { redirect } from 'next/navigation'
export default function ModulesPage() {
  redirect('/admin/billing?tab=modulos')
}
```

O directamente redirigir al billing sin el tab (el tab puede ser un searchParam opcional).

### 8.3 ModuleToggleList: link interno corregido

**Archivo:** `src/components/admin/module-toggle-list.tsx`

- [ ] El link interno "Ir a Suscripción" que apunta a `/admin/billing` ya está correcto — verificar que el texto diga "Suscripción" y no "Billing"

---

## FASE 9 — Gastos: Categorías Dinámicas por Tienda

### 9.1 Concepto

Las categorías de gastos dejan de ser hardcoded. Cada tienda tiene sus propias categorías, guardadas en `stores.config.expense_categories: string[]`. Las 4 categorías por defecto se usan como seed solo en el primer uso (si el array está vacío).

**Categorías predeterminadas (seed, mínimas):** `['insumos', 'alquiler', 'servicios', 'otro']`

**Regla de filtros:** El filtro de categorías en el toolbar de gastos **solo muestra categorías que tienen al menos un gasto registrado**. No mostrar categorías vacías para no generar ruido.

### 9.2 Schema / Config

No requiere nueva tabla. Las categorías van en `stores.config`:

```json
{
  "expense_categories": ["alquiler", "servicios", "logística", "mi categoria custom"]
}
```

- [ ] En `src/lib/types/index.ts`, en el tipo `StoreConfig`, agregar:

```ts
export type StoreConfig = {
  // ... campos existentes ...
  expense_categories?: string[]
}
```

### 9.3 Hook para gestionar categorías de gastos

**Archivo nuevo:** `src/lib/hooks/use-expense-categories.ts`

```ts
import { useStoreConfig } from './use-store-config'
import { useUpdateStoreConfig } from './use-store-config'  // o similar

const DEFAULT_CATEGORIES = ['alquiler', 'servicios', 'insumos', 'personal', 'marketing', 'transporte', 'impuestos', 'otro']

export function useExpenseCategories() {
  const { data: store } = useStoreConfig()
  const categories = (store?.config as StoreConfig)?.expense_categories ?? DEFAULT_CATEGORIES
  return categories
}

export function useAddExpenseCategory() {
  // Llama a updateStoreConfig agregando la nueva categoría al array
}
```

### 9.4 Sheet "Nuevo gasto" — Selector de categoría dinámico

**Archivo:** `src/app/(admin)/admin/expenses/page.tsx`

- [ ] Reemplazar el `<Select>` hardcoded de categorías por un combobox dinámico
- [ ] El combobox muestra las categorías del store (hook `useExpenseCategories`)
- [ ] Al tipear en el combobox, si el texto no coincide con ninguna existente, mostrar opción "Crear categoría: [texto]"
- [ ] Al seleccionar "Crear categoría: [texto]": agregar al array de categorías del store (`useAddExpenseCategory`) y seleccionarla

**Implementación con `cmdk`** (ya instalado):

```tsx
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from 'cmdk'

// Dentro del campo "Categoría" en el sheet de nuevo gasto:
<div className="space-y-1.5">
  <Label>Categoría</Label>
  <Popover open={catOpen} onOpenChange={setCatOpen}>
    <PopoverTrigger asChild>
      <Button variant="outline" className="w-full justify-between h-8 font-normal">
        {selectedCategory || 'Seleccionar categoría...'}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
      <Command>
        <CommandInput placeholder="Buscar o crear..." value={catQuery} onValueChange={setCatQuery} />
        <CommandList>
          <CommandEmpty>
            {catQuery && (
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted"
                onClick={() => handleCreateCategory(catQuery)}
              >
                <Plus className="h-3.5 w-3.5" />
                Crear "{catQuery}"
              </button>
            )}
          </CommandEmpty>
          {categories.map((cat) => (
            <CommandItem key={cat} onSelect={() => { setSelectedCategory(cat); setCatOpen(false) }}>
              {cat}
            </CommandItem>
          ))}
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>
```

- [ ] Importar `Popover`, `PopoverContent`, `PopoverTrigger` de `@/components/ui/popover`
- [ ] Importar `Command`, `CommandInput`, etc. de `@/components/ui/command`

### 9.5 Filtro de categorías en EntityToolbar

**Archivo:** `src/components/shared/entity-toolbar.tsx`

- [ ] Agregar preset `'gastos'`
- [ ] El preset `'gastos'` recibe `expenseCategories?: string[]` — solo las que ya tienen al menos 1 gasto

En `expenses/page.tsx`:
```ts
// Calcular qué categorías tienen gastos antes de pasar al toolbar
const usedCategories = useMemo(() => {
  const counts: Record<string, number> = {}
  expenses.forEach((e) => {
    if (e.category) counts[e.category] = (counts[e.category] ?? 0) + 1
  })
  return Object.keys(counts).sort()
}, [expenses])
```

- [ ] Pasar `expenseCategories={usedCategories}` al `EntityToolbar`
- [ ] El filtro muestra las categorías como checkboxes; si `usedCategories` está vacío, no mostrar sección de categorías
- [ ] Agregar prop `expenseCategories?: string[]` al tipo `EntityToolbarProps`

---

## FASE 10 — Ventas: Autocomplete de Cliente + Sección Envío

### 10.1 Autocomplete de cliente existente

**Archivo:** `src/app/(admin)/admin/ventas/page.tsx`

- [ ] Al escribir en el campo "Nombre del cliente", hacer búsqueda debounced en `useCustomers({ search: debouncedCustomerName, pageSize: 5 })`
- [ ] Mostrar dropdown de sugerencias (max 5 resultados): nombre + teléfono
- [ ] Al seleccionar: pre-llenar nombre, teléfono, guardar `selectedCustomerId`
- [ ] Si el cliente seleccionado tiene cuenta (`savings_account`), y el método de pago es `savings`, filtrar las cuentas para mostrar solo la del cliente
- [ ] Si no se selecciona ningún cliente existente y se escribe nombre nuevo → crear cliente al confirmar venta (comportamiento actual)

### 10.2 Sección "Envío" colapsable en PaymentPanel

- [ ] Agregar estados: `showShipping`, `shippingAddress`, `deliveryDate`, `shippingNotes`
- [ ] En `PaymentPanel`, entre la sección "Cliente" y "Método de cobro", agregar:

```tsx
{/* Envío — collapsible */}
<div className="rounded-lg border">
  <button
    type="button"
    onClick={() => setShowShipping((v) => !v)}
    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
  >
    <span className="flex items-center gap-2">
      <Truck className="h-4 w-4 text-muted-foreground" />
      Envío
    </span>
    <span className="flex items-center gap-2">
      {shippingAddress && (
        <span className="text-xs text-muted-foreground font-normal truncate max-w-[140px]">
          {shippingAddress}
        </span>
      )}
      <span className="text-xs text-muted-foreground font-normal">Opcional</span>
      {showShipping ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
    </span>
  </button>
  {showShipping && (
    <div className="px-4 pb-4 space-y-2 border-t pt-3">
      <Input
        placeholder="Dirección de entrega"
        value={shippingAddress}
        onChange={(e) => setShippingAddress(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Fecha de entrega (opcional)</label>
        <Input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <Input
        placeholder="Notas de envío (opcional)"
        value={shippingNotes}
        onChange={(e) => setShippingNotes(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  )}
</div>
```

- [ ] Incluir datos de envío en el `input` de `createSale` → pasar como parte del `notes` o `metadata`:

```ts
const input: CreateSaleInput = {
  ...
  ...(shippingAddress.trim() ? {
    notes: [notes, `Envío: ${shippingAddress}${deliveryDate ? ` · Entrega: ${deliveryDate}` : ''}${shippingNotes ? ` · ${shippingNotes}` : ''}`]
      .filter(Boolean).join(' | ')
  } : {}),
}
```

- [ ] Importar `Truck` de lucide-react en `ventas/page.tsx` (si no está ya)

### 10.3 Resetear envío al limpiar venta

- [ ] En `resetSale()`, agregar reset de estados de envío:

```ts
setShowShipping(false)
setShippingAddress('')
setDeliveryDate('')
setShippingNotes('')
```

---

## FASE 11 — Bugs Secundarios y Pulido

### 11.1 Banners — Search sin efecto

**Archivo:** `src/app/(admin)/admin/banners/page.tsx`

- [x] Filtrar banners con `search`:

```tsx
const filtered = (items as BannerRow[]).filter((b) =>
  !search.trim() || b.title?.toLowerCase().includes(search.toLowerCase())
)
// Usar filtered en el render
```

### 11.2 Banners — Switch invisible en tarjeta

- [x] En `SortableItem`, verificar que el Switch del banner sea interactivo
- [x] Si hay conflicto con el drag, usar `e.stopPropagation()` en el `onClick` del Switch

### 11.3 Finance — Botón "Exportar" sin acción

- [x] Conectar al menos un toast: `toast.message('Próximamente', { description: 'La exportación estará disponible pronto.' })`
- [x] O implementar exportación CSV básica usando `papaparse` (ya instalado): exportar `filtered` como CSV con columnas descripción, tipo, monto, fecha

### 11.4 Savings — Query con string vacío

**Archivo:** `src/app/(admin)/admin/savings/page.tsx`

- [x] Asegurar que `useSavingsMovements` no dispara query si `accountId` es `''`:

```tsx
const { data: movements = [] } = useSavingsMovements(selectedAccountId || undefined)
// Y en el hook: enabled: Boolean(accountId)
```

### 11.5 Órdenes y Productos — Header spacing inconsistente

**Archivos:** `src/app/(admin)/admin/orders/page.tsx` y `src/app/(admin)/admin/products/page.tsx`

- [x] Ambas usan `p-4 sm:p-6 space-y-4` en el wrapper raíz. Alinear al patrón estándar:

```tsx
// Wrapper:
<div className="space-y-6">
  // Header: <div className="px-4 sm:px-6 pt-4">
  // Toolbar: <div className="px-4 sm:px-6">
  // Content: <div className="px-4 sm:px-6 pb-6">
```

### 11.6 Dashboard — Ícono de "sin stock" incorrecto

**Archivo:** `src/app/(admin)/admin/page.tsx`

- [x] El stat "sin stock" usa el ícono `Users` — cambiar a `Package` o `Boxes`

### 11.7 Shipping — Búsqueda client-side sobre datos paginados

**Archivo:** `src/app/(admin)/admin/shipping/page.tsx`

- [x] El `search` filtra solo los items de la página cargada. Pasar `search` como parámetro al hook `useShipments` para filtrar server-side si el handler lo soporta; si no, agregar soporte en el handler `list_shipments`

---

## FASE 12 — Mejoras Proactivas (post-revisión integral)

Después de analizar toda la sinergia del sistema, estas son las mejoras adicionales detectadas. Evaluadas y aprobadas para incluir en el plan.

### 12.1 Badge numérico de "Pedidos pendientes" en el sidebar

**Problema:** No hay forma de saber de un vistazo cuántos pedidos están pendientes sin entrar al módulo.

**Archivo:** `src/components/admin/admin-shell.tsx`

- [x] Agregar un `usePendingOrdersCount()` hook (TanStack Query, refresca cada 60s) que consulta `orders?status=pending&store_id=...` y devuelve el count
- [x] En el ítem de nav "Pedidos", mostrar un `<span>` con el conteo si > 0:

```tsx
// En buildNav, el ítem de Pedidos:
{
  key: 'orders',
  label: 'Pedidos',
  icon: ShoppingBag,
  href: '/admin/orders',
  badge: pendingCount > 0 ? pendingCount : undefined,
}
```

- [x] En el componente que renderiza cada ítem de nav, agregar:
```tsx
{item.badge && (
  <span className="ml-auto text-[10px] font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
    {item.badge > 99 ? '99+' : item.badge}
  </span>
)}
```

### 12.3 POS (Ventas): método "Cuenta corriente" vincula automáticamente a savings account

**Problema:** Hoy si el admin elige "Cuenta corriente" en el POS, no pasa nada automáticamente en la cuenta del cliente.

**Archivo:** `src/app/(admin)/admin/ventas/page.tsx` + handler `create_sale`

- [x] Cuando el método de cobro seleccionado en el POS es `savings` (cuenta corriente): handler crea pedido con `status: 'pending'` y registra withdrawal en la cuenta
- [x] En ventas page: al seleccionar cliente con cuenta vinculada y método savings, auto-selecciona la cuenta
- [ ] En el `confirmOrderPayment(orderId)` de 7.8, si el método era `account`: registrar el movimiento de **abono** correspondiente en la cuenta

Esto cierra el loop: el fiado se registra en la cuenta automáticamente.

### 12.4 Filtro por cliente en pedidos y en cuentas

**Módulo Pedidos:**
- [x] En preset `'pedidos'` del toolbar, agregar selector de cliente → `customer_id` en `AppliedEntityFilters`
- [x] Conectar al hook `useOrders({ customer_id: filters.customerId })`
- [x] Handler `list_orders` acepta `customer_id` como filtro

**Módulo Cuentas:**
- [x] Preset `'cuenta'` del toolbar también tiene el filtro de cliente (mismo Select)

### 12.5 Carrito: cuándo se limpia

**Regla clara de comportamiento del carrito:**
- **Flujo WhatsApp:** el carrito se limpia al abrir el link de WhatsApp (comportamiento actual — mantener).
- **Flujo checkout online:** el carrito se limpia **solo después de que el servidor confirma la creación del pedido** (en el `onSuccess` del server action `createCheckoutOrder`), no al entrar a `/[slug]/checkout` ni al hacer click en "Confirmar".
- En la pantalla de éxito del checkout, el botón "Seguir comprando" vuelve al catálogo con el carrito ya vacío (se limpió al confirmar).

### 12.7 Configuración: campo "WhatsApp" siempre visible aunque checkout esté activo

**Archivo:** `src/app/(admin)/admin/settings/page.tsx`

- [ ] Asegurarse de que el campo de número de WhatsApp en Configuración nunca se oculte cuando se activa el checkout. El WhatsApp sigue siendo el canal de soporte/contacto aunque no sea el canal de pedidos principal.

### 12.8 Clientes: crear cliente desde el POS sin salir

**Problema:** Hoy si el cliente no existe, el POS guarda el nombre como string libre pero no crea un registro en `customers`.

- [x] En el POS, si el admin tipea un nombre que no matchea ningún cliente existente, mostrar opción `Crear "[nombre]"` al final de las sugerencias
- [x] Al seleccionar "Crear", crear el cliente en `customers` → `create_customer` handler + action + hook
- [x] La venta se vincula con `customer_id` del cliente recién creado

### 12.9 OrderSheet: estados completos + página de seguimiento para el cliente

#### Estados del pedido en OrderSheet

- [x] El OrderSheet ya tiene el flujo de estados completo con barra de progreso y botones de avance/cancelar
  - Si `pending` → botón "Confirmar pago" (ver 7.8) + botón "Cancelar"
  - Si `confirmed` → botón "Marcar en preparación" + botón "Cancelar"
  - Si `preparing` → botón "Marcar como entregado"
  - Si `delivered` / `cancelled` → solo lectura, sin botones de acción

- [ ] Server action `updateOrderStatus(orderId: string, status: OrderStatus)`:
  - Actualiza `orders.status`
  - Si `status = 'confirmed'` y `payments.status !== 'approved'` → marcar pago como aprobado también
  - Invalida query `orders`

**Barra de progreso visual de estado:**

```tsx
// En OrderSheet, debajo del header — barra de progreso de estado
const STEPS: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivered']
const currentStep = STEPS.indexOf(order.status)

<div className="flex items-center gap-1 px-6 py-3 border-b">
  {STEPS.map((step, i) => (
    <React.Fragment key={step}>
      <div className={`flex flex-col items-center gap-0.5 flex-1 ${i <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
        <div className={`h-1.5 w-full rounded-full ${i <= currentStep ? 'bg-primary' : 'bg-border'}`} />
        <span className="text-[10px] font-medium hidden sm:block">{STATUS_LABELS[step]}</span>
      </div>
      {i < STEPS.length - 1 && <div className="h-1.5 w-2 shrink-0" />}
    </React.Fragment>
  ))}
</div>
```

Si `status = 'cancelled'`, mostrar badge "Cancelado" en rojo en lugar de la barra.

#### Página de seguimiento del cliente

**Nueva ruta pública:** `src/app/(public)/tracking/[code]/page.tsx`

Esta ruta ya existe en el proyecto (`src/app/(public)/tracking/[code]/page.tsx`). Verificar su estado actual y completarla o rediseñarla para que muestre:

- Número de pedido (últimos 6 caracteres del UUID, en mayúsculas: `#A3B7F2`)
- Nombre del cliente (si existe)
- Fecha del pedido
- **Barra de progreso** de los mismos 4 estados: Recibido → Confirmado → Preparando → Entregado (o Cancelado)
- Estado actual destacado
- Lista de items del pedido (nombre + cantidad + precio)
- Total
- Sin botones de edición — es solo lectura para el cliente

**Generación del link de seguimiento:**

El `code` de la URL es el `order.id` completo (UUID) o un código corto. Usar UUID directamente para mayor simplicidad.

URL: `https://[slug].kitdigital.ar/tracking/[orderId]`

En dev: `http://localhost:3000/[slug]/tracking/[orderId]` — ver si la ruta actual ya soporta esto o si hace falta mover a `src/app/(public)/[slug]/tracking/[orderId]/page.tsx`.

#### Link de seguimiento en OrderSheet

- [x] En el footer del `OrderSheet`, link de tracking copiable + botón WhatsApp para enviar el link al cliente

```tsx
{/* Link de seguimiento */}
<div className="px-6 py-3 border-t flex items-center gap-2">
  <span className="text-xs text-muted-foreground flex-1 truncate">
    {trackingUrl}
  </span>
  <button
    type="button"
    aria-label="Copiar link"
    onClick={() => { navigator.clipboard.writeText(trackingUrl); toast.success('Link copiado') }}
    className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
  >
    <Copy className="h-3.5 w-3.5" />
  </button>
  {/* Si hay cliente con teléfono */}
  {customer?.phone && (
    <a
      href={`https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Hola ${customer.name}, podés seguir tu pedido aquí: ${trackingUrl}`
      )}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Enviar por WhatsApp"
      className="shrink-0 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
    >
      <MessageCircle className="h-3.5 w-3.5" />
    </a>
  )}
</div>
```

`trackingUrl` se construye como:
```ts
const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${store.slug}/tracking/${order.id}`
// o con subdominio en producción: `https://${store.slug}.kitdigital.ar/tracking/${order.id}`
```

- [x] Importar `Copy` de lucide-react en `order-sheet.tsx`
- [x] La tracking page funciona sin autenticación: `src/app/(public)/[slug]/tracking/[orderId]/page.tsx`
- [x] La tracking page no devuelve datos sensibles: solo estado, items, total y nombre del cliente

---

## Estado final esperado por módulo

| Módulo | Mobile card | Sheet estándar | Filtros en toolbar | Bugs/mejoras | Nuevo/Cambiado |
|--------|-------------|----------------|-------------------|--------------|----------------|
| Dashboard | N/A | N/A | N/A | [ ] Ícono stock | — |
| Ventas (POS) | N/A | N/A | N/A | — | [ ] Autocomplete cliente+crear, [ ] Envío, [ ] Fiado→cuenta |
| Pedidos | [x] Tiene | [ ] | [ ] Status+cliente→toolbar | [ ] Header spacing | [ ] Badge pendientes sidebar, [ ] Estados completos, [ ] Link tracking |
| Clientes | [x] Tiene | [ ] Completar tabs | — | [ ] Tab Pedidos real, [ ] Tab Cuenta | [ ] Integración cuentas |
| Cuentas (ex-Ahorros) | N/A (cards) | [ ] | [ ] Filtro cliente | [ ] Query vacío | [ ] Nuevo concepto + customer_id |
| Productos | [ ] AGREGAR | [x] Tiene | [x] Tiene | [ ] Header spacing | — |
| Categorías | N/A (lista) | [ ] | — | — | — |
| Banners | N/A (grilla) | [ ] | — | [ ] Search, [ ] Switch | — |
| Stock | [x] Tiene | [ ] | [ ] Chips → toolbar | — | — |
| Envíos | [x] Tiene | [ ] | [ ] Tabs → segmented | [ ] Search paginado | — |
| **Métodos de pago** | N/A (config) | [ ] | N/A | — | **REESCRIBIR COMPLETO** + toggle checkout |
| Tareas | [x] Tiene | [ ] | — | **[x] Bug created_by** | — |
| Finanzas | [x] Tiene | [ ] | [ ] Chips → toolbar | [ ] Exportar | — |
| Gastos | [x] Tiene | [ ] | [ ] Cats usadas→toolbar | — | [ ] Categorías dinámicas |
| **Suscripción** (ex-Billing) | N/A | N/A | — | — | [ ] Tab Módulos integrado |
| Configuración | N/A (form) | N/A | — | [ ] WhatsApp siempre visible | — |
| Asistente | N/A (chat) | N/A | — | — | — |
| **Checkout público** | N/A | N/A | N/A | — | **NUEVA ruta + página** |
| **Tracking público** | N/A | N/A | N/A | — | **Completar/rediseñar ruta existente** |

---

---

## FASE 13 — Sincronización Final de Schema y Clear SQL

> **Ejecutar al final de todo**, después de que todas las migraciones hayan sido aplicadas en Supabase y verificadas.

El `schema.sql` tiene dos capas que deben mantenerse sincronizadas:
- **Capa A — `CREATE TABLE IF NOT EXISTS`:** definición canónica de cada tabla, para crear la DB desde cero.
- **Capa B — bloques `DO $$`:** migraciones condicionales para aplicar sobre una DB existente.

Las migraciones de Fase 5 solo tocan la Capa B. Esta fase las sube también a la Capa A para que el schema quede como fuente de verdad completa.

### 13.1 Promover `payment_methods` a definición permanente

En `schema.sql`, dentro del bloque `-- TABLAS (CREATE TABLE IF NOT EXISTS)`, agregar **antes** de las tablas de órdenes o al final de las tablas principales:

```sql
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('transfer', 'mp')),
  name TEXT NOT NULL DEFAULT '',
  instructions TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 13.2 Actualizar tabla `savings_accounts`: agregar `customer_id` inline

Localizar el `CREATE TABLE IF NOT EXISTS savings_accounts` en `schema.sql` y agregar la columna en la definición:

```sql
-- AGREGAR dentro del CREATE TABLE IF NOT EXISTS savings_accounts:
customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
```

Si la tabla ya existe en producción, la columna se agrega via el bloque DO $$ de Fase 5 (ya documentado). En el CREATE TABLE IF NOT EXISTS la declaramos para que la creación desde cero también la incluya.

### 13.3 Actualizar tabla `customers`: agregar `notes` inline

Localizar `CREATE TABLE IF NOT EXISTS customers` y agregar:

```sql
-- AGREGAR dentro del CREATE TABLE IF NOT EXISTS customers:
notes TEXT,
```

### 13.4 Actualizar constraint `orders.source` en la definición de tabla

Localizar `CREATE TABLE IF NOT EXISTS orders` y en la columna `source`, actualizar el CHECK para incluir `'checkout'`:

```sql
-- ACTUAL:
source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'whatsapp', 'mp_checkout')),

-- CORRECTO:
source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'whatsapp', 'mp_checkout', 'checkout')),
```

### 13.5 Agregar índices de `payment_methods` a la sección de índices

En `schema.sql`, en la sección de índices (donde están los `CREATE INDEX IF NOT EXISTS`), agregar:

```sql
CREATE INDEX IF NOT EXISTS idx_payment_methods_store ON payment_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_active ON payment_methods(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_customer ON savings_accounts(customer_id)
  WHERE customer_id IS NOT NULL;
```

### 13.6 Agregar RLS de `payment_methods` a la sección de policies

En `schema.sql`, en la sección de RLS policies (buscar el patrón de otras tablas como `expenses`), agregar:

```sql
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_methods_select ON payment_methods;
CREATE POLICY payment_methods_select ON payment_methods FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS payment_methods_insert ON payment_methods;
CREATE POLICY payment_methods_insert ON payment_methods FOR INSERT
  WITH CHECK (
    store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id)
  );

DROP POLICY IF EXISTS payment_methods_update ON payment_methods;
CREATE POLICY payment_methods_update ON payment_methods FOR UPDATE
  USING (
    store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id)
  );

DROP POLICY IF EXISTS payment_methods_delete ON payment_methods;
CREATE POLICY payment_methods_delete ON payment_methods FOR DELETE
  USING (
    store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id)
  );
```

### 13.7 Agregar trigger `updated_at` de `payment_methods` a la sección de triggers

En `schema.sql`, en la sección de triggers (buscar el patrón `DROP TRIGGER IF EXISTS ... CREATE TRIGGER`), agregar:

```sql
DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 13.8 Actualizar `clear.sql`: agregar `payment_methods` al comentario de cascadas

`payment_methods` tiene `ON DELETE CASCADE` desde `stores`, así que se borra automáticamente al hacer `DELETE FROM stores`. Solo hay que actualizar el comentario para que quede documentado:

```sql
-- ACTUAL (línea ~22):
--      savings_accounts → savings_movements,

-- CORRECTO: agregar en la lista de cascadas de stores:
--      savings_accounts → savings_movements,
--      payment_methods,
```

### 13.9 Verificar que `schema.sql` es idempotente tras los cambios

- [ ] Re-ejecutar el `schema.sql` completo en Supabase SQL editor
- [ ] Verificar que no lanza ningún error (todo debe ser IF NOT EXISTS / DROP+CREATE / idempotente)
- [ ] Si hay errores: revisar constraints duplicados o tipos conflictivos

### 13.10 Regenerar tipos TypeScript

```bash
pnpm types:db
```

- [ ] Verificar que `src/lib/types/database.ts` refleja:
  - La tabla `payment_methods` con sus columnas
  - La columna `customer_id` en `savings_accounts`
  - La columna `notes` en `customers`
- [ ] Corregir cualquier error de TypeScript que aparezca por tipos desactualizados

### 13.11 Checklist de coherencia final

Antes de dar el proyecto por terminado, verificar:

- [ ] `schema.sql` tiene `payment_methods` en el bloque de tablas permanentes
- [ ] `schema.sql` tiene los nuevos campos inline en `savings_accounts` y `customers`
- [ ] `schema.sql` tiene el constraint de `orders.source` actualizado
- [ ] `schema.sql` tiene los índices, RLS y trigger de `payment_methods`
- [ ] `clear.sql` tiene el comentario de cascadas actualizado
- [ ] `src/lib/types/database.ts` está regenerado y sin errores
- [ ] `src/lib/types/index.ts` tiene `'checkout'` en `ModuleName`
- [ ] `pnpm build` pasa sin errores de TypeScript

---

## Notas para el agente ejecutor

1. **Leer el archivo completo** antes de editar. Los snippets son guía, no reemplazos literales; siempre leer el archivo real primero.
2. **Orden estricto:** Fase 5 (DB migrations) antes de Fases 6, 7, 9, 12.
3. **pnpm types:db** después de cualquier cambio en schema.sql.
4. **ReadLints** después de cada fase sustantiva.
5. **No crear archivos** salvo los indicados: `checkout.ts`, `checkout-view.tsx`, `payment-methods.ts`, `use-payment-methods.ts`, `use-expense-categories.ts`. La tracking page ya existe en `src/app/(public)/tracking/[code]/page.tsx` — solo completarla.
6. **Idioma español** en toda la UI. Sin emojis.
7. Al completar cada ítem, marcar `[x]`.
8. **Checkout es opt-in:** nunca activar `stores.modules.checkout` automáticamente. Solo cuando el admin activa el toggle explícito y tiene al menos un método configurado y activo.
9. **Carrito:** se limpia en WhatsApp al abrir el link. Se limpia en checkout solo en el `onSuccess` del server action (no antes). Nunca limpiar al entrar a `/checkout`.
10. **Categorías de gastos en filtros:** solo las que tienen gastos. `usedCategories` se computa client-side desde los gastos ya cargados.
11. **`confirmOrderPayment(orderId)`** es el único punto de verdad para confirmar pagos. Maneja: `orders.status`, `payments.status`, y si aplica el movimiento en `savings_account_movements`.
12. **Tracking page:** pública, sin auth, sin datos sensibles. Solo muestra estado, items, total y nombre del cliente. El `code` es el `order.id` UUID completo.
13. **POS — crear cliente:** mantener el flujo simple. El campo de nombre sigue siendo de texto libre. Solo al seleccionar explícitamente "Crear cliente [nombre]" del dropdown se crea el registro. No forzar al admin.
14. **Fase 13 es obligatoria:** no es opcional. Sin ella, el `schema.sql` queda desincronizado y cualquier deploy desde cero va a fallar silenciosamente o tener columnas faltantes.
15. **Flujo correcto de schema:** siempre editar `schema.sql` → ejecutar en Supabase → `pnpm types:db`. Nunca al revés.
16. **Renumeración de fases en este doc:** las fases son 0–13. No renumerar.
