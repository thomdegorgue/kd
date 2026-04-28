# MODULOS.md — Plan Maestro de Reagrupación, Sincronías y Polish Premium

> **Fecha:** 28 de abril de 2026
> **Objetivo:** Reorganizar el sistema modular de KitDigital para que el cliente compre **paquetes** (no módulos sueltos), pulir la UI a nivel premium en **todos** los módulos, y dejar `/admin/billing` impecable.
> **Metodología:** Fases atómicas, paso a paso, cada paso con **checkbox**. Un agente IA debe poder ejecutar el plan sin contexto previo.
> **Status:** 🟡 plan en ejecución

---

## ⚠️ INSTRUCCIONES PARA EL AGENTE EJECUTOR

1. **Marcá cada paso al terminar:** `- [ ]` → `- [x]`. Actualizá la tabla "Estado actual".
2. **Un cambio a la vez.** Leé el archivo antes de tocarlo. No mezcles refactors no pedidos.
3. **Verificá TypeScript** después de cada fase: `pnpm tsc --noEmit`.
4. **Nunca rompas la facturación existente.** El cambio a "grupos" es **aditivo + migración compatible**: las tiendas activas con módulos sueltos siguen funcionando hasta que se migren al modelo de grupo.
5. **Las migraciones SQL** se corren en el SQL Editor de Supabase. Son **idempotentes**.
6. **El plan se basa en el código actual** (`src/lib/billing/calculator.ts`, `src/components/admin/billing-panel.tsx`, `src/components/admin/module-toggle-list.tsx`, `src/components/landing/pricing-calculator.tsx`).
7. **Patrón premium de referencia:** `Sheet` (de pedidos `order-sheet.tsx` y productos `product-sheet.tsx`), botones `rounded-lg` del `Button` de `@/components/ui/button`, `Card` con header/content, `AlertDialog` para confirmaciones destructivas, `RadioGroup` con label-card de `ventas/page.tsx` (líneas 670-700).

---

## Estado actual

| Área                                  | Estado |
|---------------------------------------|--------|
| packs.ts canónico                     | ✅ FASE 1 completada |
| SQL migrations (pack_price, bundle)   | ✅ FASE 1 completada (ejecutada en Supabase) |
| calculator.ts actualizado (derivado)  | ✅ FASE 1 completada |
| Server action togglePack               | ✅ FASE 2 completada |
| Hook useTogglePack                     | ✅ FASE 2 completada |
| synchronies.ts + warnings              | ✅ FASE 3 completada |
| `/admin/billing` premium              | 🟡 FASE 4 en ejecución |
| Stock — modal premium                 | ❌ usa Dialog básico |
| Finance — formulario premium          | ❌ usa Dialog básico |
| Expenses, Savings, Payments — UI pro  | ❌ tablas planas |
| Botones redondeados consistentes      | ⚠️ ya existe en `button.tsx` (`rounded-lg`) — falta auditar usos custom |
| Selectores/desplegables consistentes  | ⚠️ usar `Select` de `@/components/ui/select` en todos lados |
| Pricing calculator (vitrine)          | ✅ existe — falta migrar a grupos |
| Plan anual — incluye todo PRO         | ✅ ya existe lógica |

---

## Leyenda de prioridad

| Símbolo | Urgencia |
|---------|---------|
| 🔴 | Bloqueante de la nueva propuesta comercial |
| 🟠 | Polish crítico antes de vender |
| 🟡 | Mejora visible — sprint próximo |
| 🟢 | Nice-to-have |

---

## CONTEXTO: cómo funciona hoy el sistema

### Mapa modular actual (`src/lib/types/index.ts` → `ModuleName`)

20 módulos, 3 tiers internos:

**CORE** (no se pueden desactivar — `src/lib/validations/module.ts` línea 12):
- `catalog`, `cart`, `products`, `categories`, `orders`

**BASE** (incluidos en todo plan, sin costo extra — `src/lib/billing/calculator.ts` línea 18):
- `stock`, `payments`, `banners`, `social`, `product_page`, `shipping`, `custom_domain`

**PRO** (cada uno suma $5.000/mes — `src/lib/billing/calculator.ts` línea 7):
- `variants`, `wholesale`, `finance`, `expenses`, `savings_account`, `multiuser`, `tasks`, `assistant`

### Cómo cobra hoy (`computeMonthlyTotal`)

```
total = ceil(maxProducts / 100) × price_per_100_products  +  count(PRO activos) × pro_module_price
```

Con plan de seed:
- `price_per_100_products = $20.000`
- `pro_module_price = $5.000`
- Plan **anual**: paga 10 meses, recibe 12, **incluye todos los PRO menos `assistant`**.

### Sincronías existentes detectadas

- `ventas` ←→ `stock` (descuenta stock al vender) — ver `ventas/page.tsx:570`
- `ventas` ←→ `savings_account` (paga con cuenta de ahorro) — ver `ventas/page.tsx:687`
- `orders` ←→ `payments` (registro de cobros)
- `orders` ←→ `finance` (movimientos de caja generados desde pedidos — `idx_finance_entries_order_id`)
- `expenses` ←→ `finance` (`idx_expenses_finance_entry_id`)
- `savings_account` ←→ `finance` (`idx_savings_movements_finance_entry_id`)
- `products` ←→ `variants` (variantes de producto)
- `products` ←→ `wholesale` (precios mayoristas)
- `multiuser` ←→ `tasks` (asignar tareas a miembros)
- `assistant` ←→ todos (lee orders, products, finance, etc.)

---

## NUEVA PROPUESTA COMERCIAL — paquetes en lugar de sueltos

### Filosofía

> "El cliente no debería pensar módulo por módulo. Debe pensar **'¿necesito vender, gestionar plata o automatizar?'**"

### Definición de paquetes (PACKS)

| Pack ID | Nombre comercial | Precio mensual | Módulos incluidos |
|---------|------------------|---------------:|-------------------|
| `core` | **Core — Catálogo Online** | **$0** (incluido siempre) | `catalog`, `products`, `categories`, `cart`, `orders`, `banners`, `social`, `product_page`, `custom_domain` |
| `operations` | **Operaciones Pro** | **$10.000** | `stock`, `shipping`, `variants`, `payments` |
| `finance` | **Finanzas Pro** | **$10.000** | `finance`, `expenses`, `savings_account` |
| `team` | **Equipo Pro** | **$10.000** | `multiuser`, `tasks`, `wholesale` |
| `ai` | **Asistente IA** ⚡ | **$10.000** ⚠️ destacado | `assistant` |

> **Notas comerciales clave:**
> - `core` siempre activo, gratis. Incluye banners, redes y dominio personalizado (que NO eran tan relevantes y ahora viajan con core).
> - Cada pack pago vale **$10.000/mes**, fijo, sin importar el tier de productos. Lo que escala con productos es el **tier base** (precio del catálogo).
> - **IA va aparte y destacado** porque vale lo mismo pero el ROI es distinto y se vende como "el módulo estrella".
> - Se puede comprar 0, 1, 2, 3 o 4 packs pagos. Si comprás los **3 packs operativos** (operations + finance + team) podés ofrecer un descuento de bundle (sugerido: $25.000 en lugar de $30.000).
> - **Plan anual** sigue funcionando: paga `12 - annual_discount_months` meses y recibe los 4 packs operativos (no IA).

### Tier base de productos (no cambia)

`ceil(maxProducts / 100) × price_per_100_products`. El cliente elige cuántos productos puede tener.

### Backwards compatibility

- En la BD de cada `store`, `modules` sigue siendo un `JSONB` con 20 booleanos.
- Activar un pack = setear todos los `modules[]` correspondientes en `true` en una sola operación.
- Desactivar un pack = setear todos en `false`.
- Las tiendas existentes con módulos individuales activos quedan en estado **legacy** y se migran al pack equivalente al primer cambio o por cron.

---

## FASES DEL PLAN

```
FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 6 → FASE 7 → FASE 8 → FASE 9
```

| Fase | Nombre | Tiempo estimado |
|------|--------|----------------:|
| 1 | Definición de packs en código y SQL | 3–4 hs |
| 2 | Backend: activar/desactivar pack atómico | 4–6 hs |
| 3 | Sincronías cruzadas entre módulos | 4–6 hs |
| 4 | Rediseño de `/admin/billing` premium | 6–8 hs |
| 5 | Rediseño de `/admin/settings/modules` | 3–4 hs |
| 6 | Polish UI: stock, finance, expenses, savings, payments | 6–8 hs |
| 7 | Polish UI: tasks, wholesale, shipping, customers, banners | 4–6 hs |
| 8 | Vitrine pública (`/`) — pricing calculator a packs | 3–4 hs |
| 9 | QA final, smoke tests, screenshots premium | 2–3 hs |

---

## FASE 1 — DEFINICIÓN DE PACKS ✅ COMPLETADA

> **Objetivo:** Tener una fuente única de verdad de los packs en código y BD.
> **Prerequisito:** ninguno.

- [x] **1.1** Crear `src/lib/billing/packs.ts` con definición canónica de los packs
- [x] **1.2** Extender `Plan` con `pack_price` (en centavos) en BD y tipo TS
- [x] **1.3** Migrar `PRO_MODULES` y `BASE_MODULES` a derivarse de `packs.ts`
- [x] **1.4** Agregar `computePackTotal()` al lado de `computeMonthlyTotal()`
- [x] **1.5** SQL: agregar columnas `pack_price`, `bundle_3packs_price` a `plans`
- [x] **1.6** SQL: seed/upsert de los precios de pack ($10.000 c/u, $25.000 bundle)

### 1.1 — `src/lib/billing/packs.ts`

```typescript
import type { ModuleName } from '@/lib/types'

export type PackId = 'core' | 'operations' | 'finance' | 'team' | 'ai'

export type Pack = {
  id: PackId
  label: string
  description: string
  modules: readonly ModuleName[]
  price_cents: number       // 0 para core
  is_paid: boolean
  is_featured: boolean      // true solo para 'ai'
  cta?: string              // texto especial en UI
}

export const PACKS: readonly Pack[] = [
  {
    id: 'core',
    label: 'Core',
    description: 'Tu tienda online: catálogo, carrito, pedidos, banners, redes y dominio propio. Incluido siempre.',
    modules: ['catalog', 'products', 'categories', 'cart', 'orders', 'banners', 'social', 'product_page', 'custom_domain'],
    price_cents: 0,
    is_paid: false,
    is_featured: false,
  },
  {
    id: 'operations',
    label: 'Operaciones Pro',
    description: 'Stock, envíos con tracking, variantes (talles/colores) y registro de pagos.',
    modules: ['stock', 'shipping', 'variants', 'payments'],
    price_cents: 1_000_000,    // $10.000
    is_paid: true,
    is_featured: false,
  },
  {
    id: 'finance',
    label: 'Finanzas Pro',
    description: 'Flujo de caja, gastos detallados y cuentas de ahorro virtuales.',
    modules: ['finance', 'expenses', 'savings_account'],
    price_cents: 1_000_000,
    is_paid: true,
    is_featured: false,
  },
  {
    id: 'team',
    label: 'Equipo Pro',
    description: 'Multi-usuario, asignación de tareas y precios mayoristas.',
    modules: ['multiuser', 'tasks', 'wholesale'],
    price_cents: 1_000_000,
    is_paid: true,
    is_featured: false,
  },
  {
    id: 'ai',
    label: 'Asistente IA',
    description: 'Tu copiloto con acceso a productos, pedidos y finanzas. Responde, ejecuta, automatiza.',
    modules: ['assistant'],
    price_cents: 1_000_000,
    is_paid: true,
    is_featured: true,    // destacado en UI con borde violeta y badge ⚡
    cta: 'El más vendido',
  },
] as const

export const PAID_PACKS = PACKS.filter(p => p.is_paid)
export const OPERATIONAL_PACK_IDS: PackId[] = ['operations', 'finance', 'team']

export function getPack(id: PackId): Pack {
  const p = PACKS.find(p => p.id === id)
  if (!p) throw new Error(`Pack inexistente: ${id}`)
  return p
}

export function getPackByModule(module: ModuleName): Pack | undefined {
  return PACKS.find(p => p.modules.includes(module))
}

export function isModuleInActivePack(
  module: ModuleName,
  activePackIds: PackId[],
): boolean {
  return activePackIds.some(id => getPack(id).modules.includes(module))
}

/** Calcula precio total de packs activos (sin tier base). Aplica descuento si están los 3 operacionales. */
export function computePackTotal(
  activePackIds: PackId[],
  bundle3PacksPrice: number = 2_500_000,    // $25.000 default
): { subtotal: number; bundleDiscount: number; total: number; aiAddon: number } {
  const paidActive = activePackIds.filter(id => getPack(id).is_paid)
  const subtotal = paidActive.reduce((acc, id) => acc + getPack(id).price_cents, 0)

  const has3Operational = OPERATIONAL_PACK_IDS.every(id => paidActive.includes(id))
  const ops3Subtotal = OPERATIONAL_PACK_IDS.reduce((acc, id) => acc + getPack(id).price_cents, 0)
  const bundleDiscount = has3Operational ? Math.max(0, ops3Subtotal - bundle3PacksPrice) : 0

  const aiAddon = paidActive.includes('ai') ? getPack('ai').price_cents : 0

  return {
    subtotal,
    bundleDiscount,
    total: subtotal - bundleDiscount,
    aiAddon,
  }
}
```

### 1.5 — SQL idempotente

```sql
-- Pegar en Supabase SQL Editor
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'pack_price') THEN
    ALTER TABLE plans ADD COLUMN pack_price INTEGER NOT NULL DEFAULT 1000000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'bundle_3packs_price') THEN
    ALTER TABLE plans ADD COLUMN bundle_3packs_price INTEGER NOT NULL DEFAULT 2500000;
  END IF;
END $$;

UPDATE plans SET pack_price = 1000000, bundle_3packs_price = 2500000 WHERE name = 'base';
```

> Marcar al terminar: `pnpm tsc --noEmit` debe pasar sin errores.

---

## FASE 2 — BACKEND: ACTIVAR / DESACTIVAR PACK ATÓMICO ✅ COMPLETADA

> **Objetivo:** Que el dueño pueda togglear un pack completo desde billing/UI con una sola acción.

- [x] **2.1** Server action `togglePack(packId, enabled)` en `src/lib/actions/billing.ts`
- [x] **2.2** Hook `useTogglePack()` en `src/lib/hooks/use-billing.ts`
- [ ] **2.3** En `createSubscription` aceptar `packs: PackId[]` además de `pro_modules` (próxima fase)
- [ ] **2.4** En `changeTier` recalcular precio incluyendo packs (próxima fase)
- [ ] **2.5** Migrar webhook MP para reconocer el nuevo schema (próxima fase)
- [ ] **2.6** Tests unitarios de `computePackTotal()` (próxima fase)

### 2.1 — Pseudocódigo

```typescript
export async function togglePack(input: { pack_id: PackId; enabled: boolean }) {
  return executeAction('togglePack', toggleP ackSchema, input, async ({ store }) => {
    const pack = getPack(input.pack_id)
    if (pack.id === 'core') {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'El pack core no se puede desactivar' } }
    }

    const currentModules = (store.modules ?? {}) as Record<ModuleName, boolean>
    const nextModules = { ...currentModules }
    for (const m of pack.modules) {
      nextModules[m] = input.enabled
    }

    const { error } = await db.from('stores')
      .update({ modules: nextModules })
      .eq('id', store.store_id)
    if (error) throw error

    return { success: true, data: { pack_id: pack.id, enabled: input.enabled } }
  })
}
```

> El pack `ai` debe respetar la lógica anual existente: si la tienda está en plan anual, IA se cobra como add-on mensual aparte.

---

## FASE 3 — SINCRONÍAS CRUZADAS ✅ COMPLETADA

> **Objetivo:** Reforzar las dependencias funcionales y avisar al dueño cuando active/desactive un pack que afecta a otro.

- [x] **3.1** Mapeo MODULE_DEPENDENCIES en `synchronies.ts` (finance→expenses, savings→finance, wholesale→variants, multiuser→tasks)
- [x] **3.2** Función `getMissingDependencies()` y `getModuleSyncWarning()`
- [x] **3.3** Componente `PackInactiveWarning` para mostrar banner cuando módulo requerido está OFF
- [ ] **3.4** En `assistant` deshabilitar herramientas cuyos packs estén OFF (próxima fase, complejo)
- [ ] **3.5** Aplicar PackInactiveWarning en cada página de módulo PRO (próximas fases con UI polish)
- [ ] **3.6** Hook `usePackStatus(packId)` para UI avanzada (próxima fase)

### 3.5 — Banner de pack inactivo

Diseño: tarjeta con borde dasheado violeta, ícono `Zap`, CTA "Activar pack [Nombre] — $10.000/mes" → linkea a `/admin/billing#packs`. Ya hay un patrón parecido: `src/components/shared/plan-upgrade-prompt.tsx`. Reutilizar y extenderlo a packs.

---

## FASE 4 — `/admin/billing` PREMIUM

> **Objetivo:** Que `/admin/billing` se sienta tan pulido como Stripe Dashboard. Es la página donde el cliente decide gastar.
> **Patrón base:** la `Card` ya está bien, pero todo tiene que sentirse más cinematográfico.

- [ ] **4.1** Hero del plan actual: tarjeta grande con gradiente sutil, monto total visible, próximo cobro, badge de estado animado
- [ ] **4.2** Sección "Tu setup": tier de productos + grilla 2x2 de packs + tarjeta destacada IA (borde violeta `border-violet-200`, badge "⚡ Estrella")
- [ ] **4.3** Cada pack como `Card` con: ícono distintivo, módulos en chips, switch grande, precio en grande, microcopy
- [ ] **4.4** Resumen lateral sticky en desktop: subtotal por pack + descuento bundle si aplica + total con animación al cambiar
- [ ] **4.5** AlertDialog premium para cancelar (ya existe, pulir copy y agregar feedback "Cancelado hasta DD/MM")
- [ ] **4.6** Tabs Mensual/Anual mantener — estilizar bordes redondeados consistentes (`rounded-lg`)
- [ ] **4.7** Botones CTA: `size="lg"`, gradiente sutil para el principal (`bg-gradient-to-r from-primary to-primary/90`), `rounded-xl` solo en CTA primario
- [ ] **4.8** Estado vacío: si nunca contrató, mostrar "Empezá por elegir un pack" con animación de entrada
- [ ] **4.9** Historial de pagos al final (tabla compacta con estado, fecha, monto, método)
- [ ] **4.10** Skeleton premium en loading (no spinner — esqueletos con shimmer)

### 4.2 — Layout esperado (mockup textual)

```
┌─────────────────────────────────────────────────────────────────┐
│ ZAP icon · Suscripción · BillingStatusBadge (animado)           │
│ ┌─────────────────────────────────────────────────┐             │
│ │ HERO — gradiente violeta → blanco                │             │
│ │ $XX.XXX / mes  ·  Próx cobro: 5 may              │             │
│ │ Plan Mensual · 200 productos · 3 packs activos   │             │
│ │ [Cambiar plan] [Cancelar]                        │             │
│ └─────────────────────────────────────────────────┘             │
│                                                                  │
│ TABS:  [Mensual]  [Anual — ahorra 2 meses]                       │
│                                                                  │
│ ┌────────── TIER DE PRODUCTOS ──────────┐                        │
│ │ Slider visual con tiers: 100|200|...   │                        │
│ │ Precio base: $20.000/100 · Total: $40k │                        │
│ └────────────────────────────────────────┘                        │
│                                                                  │
│ PACKS (grid 2 cols)                          ┌─ RESUMEN STICKY ─┐│
│ ┌────────────┐ ┌────────────┐                │ Plan base: $40k   ││
│ │ Operaciones│ │ Finanzas   │                │ Operaciones: $10k ││
│ │ $10k/mes   │ │ $10k/mes   │                │ Finanzas: $10k    ││
│ │ [switch]   │ │ [switch]   │                │ ─ bundle: -$5k    ││
│ │ Stock,     │ │ Caja,      │                │ ───────────────── ││
│ │ Envíos,    │ │ Gastos,    │                │ TOTAL: $55k/mes   ││
│ │ Variantes, │ │ Ahorros    │                │ [Confirmar]       ││
│ │ Pagos      │ │            │                └───────────────────┘│
│ └────────────┘ └────────────┘                                     │
│ ┌────────────┐ ┌────────────────────────┐                         │
│ │ Equipo     │ │ ⚡ ASISTENTE IA        │                         │
│ │ $10k/mes   │ │ destacado borde violeta│                         │
│ │ Multi-     │ │ $10k/mes               │                         │
│ │ usuario,   │ │ Copiloto con acceso a  │                         │
│ │ Tareas,    │ │ todo tu negocio        │                         │
│ │ Mayorista  │ │ [Activar IA]           │                         │
│ └────────────┘ └────────────────────────┘                         │
│                                                                  │
│ HISTORIAL DE PAGOS (tabla)                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 — Pack `Card` (componente reutilizable)

Crear `src/components/admin/pack-card.tsx`:
- Header con ícono (cada pack su ícono lucide: `Boxes` operations, `Wallet` finance, `UsersRound` team, `Bot` ai)
- Si `is_featured`: borde `border-violet-300/60`, gradiente sutil violeta en bg
- Lista de módulos como chips pequeños (`Badge variant="secondary"`)
- Switch grande (size custom o el del shadcn standard)
- Precio en grande (text-2xl font-bold), tachado el equivalente individual si aplica
- Hover: `shadow-md` + leve translate Y
- Estado loading: skeleton del switch

---

## FASE 5 — `/admin/settings/modules` REDISEÑO

> **Objetivo:** Esta página deja de listar 20 módulos y pasa a listar **5 packs** con detalle expandible.

- [ ] **5.1** Reescribir `module-toggle-list.tsx` para mostrar packs (no módulos individuales)
- [ ] **5.2** Cada pack con `Accordion` que despliega los módulos incluidos con descripción
- [ ] **5.3** Switch a nivel pack (no módulo) — llama a `togglePack`
- [ ] **5.4** Si pack OFF, los módulos individuales se ven en gris con candado
- [ ] **5.5** Link "Cambiar pack" lleva a `/admin/billing`
- [ ] **5.6** Mantener vista "avanzada" oculta para soporte: query param `?advanced=1` muestra los 20 módulos legacy

---

## FASE 6 — POLISH UI: STOCK, FINANCE, EXPENSES, SAVINGS, PAYMENTS

> **Objetivo:** Aplicar el patrón premium de `pedidos`/`ventas` a estos módulos. Son los que el dueño usa todos los días.

### Reglas comunes para todas las páginas de esta fase

- [ ] Reemplazar todos los `Dialog` de edición por `Sheet` (lateral, como `order-sheet.tsx`)
- [ ] Header de página: ícono `Lucide` `text-muted-foreground` + título + subtítulo, separados por `border-b` solo si hay tabs
- [ ] Toolbar de búsqueda: usar `EntityToolbar` de `@/components/shared/entity-toolbar` siempre
- [ ] Tablas: `border rounded-lg overflow-x-auto`, hover de fila `hover:bg-muted/50`
- [ ] Acciones de fila a la derecha: ícono ghost (`size="icon-sm"`) — no botones con texto
- [ ] Botón primario superior: `size="default"` + ícono `Plus`, `gap-2`
- [ ] Estados vacíos: usar `EmptyState` de `@/components/shared/empty-state` con CTA
- [ ] Loading: `Skeleton` consistente, **nunca spinners**
- [ ] Confirmaciones destructivas: `AlertDialog` (no `confirm()`)
- [ ] Selectores: `Select` de shadcn, **no `<select>` nativo**

### 6.1 STOCK (`/admin/stock`)

- [ ] **6.1.1** Reemplazar el `Dialog` de "Ajustar stock" (línea 152) por `Sheet` lateral con campos: cantidad, motivo del ajuste, nota
- [ ] **6.1.2** Toolbar con filtros chip: "Solo bajo stock" + "Sin stock" + "Tracking activo" (chips, no botón outline)
- [ ] **6.1.3** Badge de stock crítico animado (pulse) cuando `quantity === 0`
- [ ] **6.1.4** Acción rápida: "+10 / +1 / -1" inline en la fila (sin abrir sheet)
- [ ] **6.1.5** Mini gráfico sparkline de movimientos últimos 7 días (si hay datos)
- [ ] **6.1.6** Botón "Importar stock CSV" en toolbar (existe `csv-importer.tsx`)
- [ ] **6.1.7** Sticky header de tabla en scroll largo

### 6.2 FINANCE (`/admin/finance`)

- [ ] **6.2.1** Reemplazar `Dialog` de "Nuevo movimiento" por `Sheet`
- [ ] **6.2.2** KPI cards arriba: Ingresos / Egresos / Balance (3 cards con ícono de color)
- [ ] **6.2.3** Mini chart de ingresos vs egresos (no requiere lib externa, usar SVG simple)
- [ ] **6.2.4** Tabla con columnas: fecha, tipo, descripción, categoría, monto, fuente (chip "Manual"/"Pedido"/"Gasto")
- [ ] **6.2.5** Filtro de período con presets: Hoy / 7d / 30d / Mes / Año / Custom
- [ ] **6.2.6** Export PDF/CSV en toolbar
- [ ] **6.2.7** Click en fila abre `Sheet` con detalle + relación cruzada (si viene de pedido, link a pedido)

### 6.3 EXPENSES (`/admin/expenses`)

- [ ] **6.3.1** `Sheet` para crear/editar gasto
- [ ] **6.3.2** Categorización con chips coloreados (Inventario, Servicios, Sueldos, Marketing, Otros)
- [ ] **6.3.3** Recurrencia: switch "Es recurrente" + selector frecuencia
- [ ] **6.3.4** Adjuntar comprobante (imagen) con `image-uploader.tsx`
- [ ] **6.3.5** Resumen mensual top + filtro por categoría (tabs)

### 6.4 SAVINGS (`/admin/savings`)

- [ ] **6.4.1** `Card` por cuenta de ahorro con saldo grande (`text-3xl font-bold`)
- [ ] **6.4.2** Acciones por cuenta: Depositar / Retirar / Transferir → cada una en `Sheet`
- [ ] **6.4.3** Historial de movimientos por cuenta (sub-tabla colapsable)
- [ ] **6.4.4** Total general arriba (suma de todas las cuentas)

### 6.5 PAYMENTS (`/admin/payments`)

- [ ] **6.5.1** Tabla de pagos con badge de método (`cash`/`transfer`/`card`/`mp_link`/`savings` con ícono)
- [ ] **6.5.2** Filtro por método (tabs) + por estado (chip)
- [ ] **6.5.3** Click en fila → `Sheet` con detalle + relación a pedido y a movimiento de finanzas
- [ ] **6.5.4** Botón "Registrar pago manual" → `Sheet`

---

## FASE 7 — POLISH UI: TASKS, WHOLESALE, SHIPPING, CUSTOMERS, BANNERS

### 7.1 TASKS (`/admin/tasks`)

- [ ] **7.1.1** Vista Kanban (Pendiente / En curso / Completada) con drag-drop (ya hay `@dnd-kit/sortable`)
- [ ] **7.1.2** Click en task abre `Sheet` con descripción, asignado, fecha límite, comentarios
- [ ] **7.1.3** Crear desde botón flotante o desde header
- [ ] **7.1.4** Filtro por asignado y por prioridad
- [ ] **7.1.5** Vista lista alternativa (tabs Kanban / Lista)

### 7.2 WHOLESALE (`/admin/wholesale`)

- [ ] **7.2.1** Tabla de productos con tier de precio inline
- [ ] **7.2.2** `Sheet` para configurar precios mayoristas por cantidad
- [ ] **7.2.3** Vista comparativa: precio normal vs mayorista con % descuento

### 7.3 SHIPPING (`/admin/shipping`)

- [ ] **7.3.1** Lista de métodos de envío con `Sheet` para editar
- [ ] **7.3.2** Tracking: tabla con buscador por código y `Sheet` con timeline del envío
- [ ] **7.3.3** Estados: "Preparando" / "Enviado" / "En tránsito" / "Entregado" como `Badge` coloreados

### 7.4 CUSTOMERS (`/admin/customers`)

- [ ] **7.4.1** `Sheet` lateral en lugar de página `[id]` (mantener URL sincronizada con query param `?id=`)
- [ ] **7.4.2** Tarjeta de cliente con avatar, total comprado, último pedido, tags
- [ ] **7.4.3** Tabs: Datos / Pedidos / Notas / Adjuntos

### 7.5 BANNERS (`/admin/banners`)

- [ ] **7.5.1** Grid de banners con drag-drop para reordenar (`@dnd-kit/sortable`)
- [ ] **7.5.2** `Sheet` para editar (imagen, link, texto alt, fecha desde-hasta)
- [ ] **7.5.3** Preview live mientras edita

---

## FASE 8 — VITRINE PÚBLICA (`/`)

> **Objetivo:** El landing de venta refleja el modelo de packs.

- [ ] **8.1** Reescribir `src/components/landing/pricing-calculator.tsx` para mostrar **5 cards de packs** (no la grilla de 20)
- [ ] **8.2** Toggle Mensual/Anual arriba (mantener)
- [ ] **8.3** Tier de productos como slider visual horizontal
- [ ] **8.4** Cada card de pack: precio grande, módulos como bullets con check verde, switch on/off
- [ ] **8.5** IA card destacada al final con `border-violet-400`, badge "El más vendido" y CTA "Probá el asistente"
- [ ] **8.6** Total flotante sticky en mobile, fixed lateral en desktop
- [ ] **8.7** Si activa los 3 packs operativos → mostrar el descuento bundle "**Ahorrás $5.000**"
- [ ] **8.8** CTA principal: "Empezá ahora — 14 días gratis" → `/auth/signup`
- [ ] **8.9** Sección de FAQ debajo: "¿Puedo cambiar de pack?" / "¿Qué pasa si dejo de pagar?" / "¿Cómo cancelo?"

---

## FASE 9 — QA FINAL

- [ ] **9.1** `pnpm tsc --noEmit` sin errores
- [ ] **9.2** `pnpm lint` sin warnings nuevos
- [ ] **9.3** Smoke test: contratar 1 pack desde billing → verificar que módulos se activan en sidebar
- [ ] **9.4** Smoke test: desactivar pack → módulos desaparecen de sidebar y banner de pack inactivo aparece en página interna
- [ ] **9.5** Smoke test: plan anual → al activarlo se prenden los 3 packs operacionales (sin IA) automáticamente
- [ ] **9.6** Smoke test: tienda legacy con 2 PRO sueltos sigue funcionando (compatibilidad)
- [ ] **9.7** Webhook MP simulado → suscripción se actualiza correctamente con packs nuevos
- [ ] **9.8** Mobile QA: cada página redibujada se ve bien en 375px de ancho
- [ ] **9.9** Lighthouse `/admin/billing` > 90 en Performance y Accessibility
- [ ] **9.10** Capturas premium para landing y soporte

---

## CHECKLIST DE PATRONES PREMIUM (referencia rápida)

> Aplicar estos patrones consistentemente en toda la app. Pegar como guía para el agente.

### Botones

```tsx
// Primario CTA grande (billing, checkout, confirmar)
<Button size="lg" className="rounded-xl gap-2 bg-gradient-to-r from-primary to-primary/90">
  <Icon className="h-4 w-4" /> Texto
</Button>

// Secundario / outline (cancelar, volver)
<Button variant="outline" size="lg" className="gap-2">Texto</Button>

// Acción de fila / tabla
<Button variant="ghost" size="icon-sm"><Icon className="h-3.5 w-3.5" /></Button>

// Destructivo (cancelar pedido, borrar)
<Button variant="destructive" size="sm">Borrar</Button>
```

### Modales / Sheets

- **Edición / detalle / formulario complejo:** `Sheet` (lateral, slide-in derecha en desktop, abajo en mobile). Patrón: `order-sheet.tsx`.
- **Confirmación destructiva:** `AlertDialog`. Patrón: `billing-panel.tsx` línea 480.
- **Confirmación rápida / mensaje corto:** `Dialog` chico (`max-w-sm`). Patrón: `SuccessTicket` en `ventas/page.tsx` línea 795.
- **Picker / selector contextual:** `Popover` + `Command`.

### Cards

```tsx
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-base">Título</CardTitle>
      <Badge>...</Badge>
    </div>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    ...
  </CardContent>
</Card>
```

### Tablas

```tsx
<div className="border rounded-lg overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Col</TableHead>
        <TableHead className="text-right" />
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="hover:bg-muted/50">
        ...
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### Estados

- **Loading:** `Skeleton` siempre, nunca `Loader2 spin` excepto botones (en botones sí está bien).
- **Vacío:** `EmptyState` con ícono grande, copy claro y CTA.
- **Error:** `ErrorState` con mensaje y botón "Reintentar".

### Selectores

```tsx
<Select value={...} onValueChange={...}>
  <SelectTrigger className="w-full sm:w-64">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="x">Opción</SelectItem>
  </SelectContent>
</Select>
```

### Switch + Card pattern (para packs y módulos)

```tsx
<Card className={isEnabled ? 'ring-2 ring-primary/20' : ''}>
  <CardContent className="flex items-center gap-3 p-4">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <p className="text-sm font-semibold">Label</p>
        <Badge variant="secondary">$10.000/mes</Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">Descripción</p>
    </div>
    <Switch checked={isEnabled} onCheckedChange={...} />
  </CardContent>
</Card>
```

### Colores / Tema

- Primary: ya configurado, usar `bg-primary text-primary-foreground`.
- Pack IA destacado: `border-violet-300/60 bg-gradient-to-br from-violet-50 to-white`.
- Estados: success `emerald-600`, warning `amber-600`, danger `destructive`.
- Muted: `muted-foreground` para texto secundario, `bg-muted/30` para fondos sutiles.

---

## ORDEN DE EJECUCIÓN SUGERIDO

```
F1 (definición packs) →
F2 (backend toggle) →
F4 (UI billing — el cliente lo ve primero) →
F5 (settings/modules) →
F3 (sincronías) →
F6 (polish stock/finance/expenses/savings/payments) →
F7 (polish tasks/wholesale/shipping/customers/banners) →
F8 (vitrine pública) →
F9 (QA)
```

> El reordenamiento (F4 antes de F3) es a propósito: que el agente vea **el resultado visual rápido** y pueda mostrarle al usuario antes de meterse en sincronías invisibles.

---

## NOTAS PARA EL AGENTE EJECUTOR

1. **Si una fase parece muy grande, dividir en subfases** y crear `MODULOS-FASE-X.md` con el detalle.
2. **Confirmar con el usuario** antes de borrar el sistema legacy de PRO sueltos en BD. Por ahora **convivir**.
3. **Cada cambio en un módulo**: probar la página en `pnpm dev`, no asumir.
4. **Las migraciones SQL**: pegarlas en Supabase SQL Editor, NUNCA correr desde código.
5. **Patrón de PR sugerido:** una fase = una rama = un PR. Más fácil de revisar.
6. **Si algo no está claro,** parar y preguntar. Mejor pausar que romper billing.
7. **Marcá los checkboxes en este archivo** a medida que vas terminando.

---

*Última actualización: 28 de abril de 2026*
*Plan generado por Claude Opus 4.7 en sesión de contextualización proactiva.*
