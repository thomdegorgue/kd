# F0 — Fundación Técnica · Runbook

**Objetivo:** el entorno existe, la DB está lista, los cimientos del código están construidos.
**Criterio de completitud:** `npm run dev` corre, Supabase conectado, 28 tablas con RLS, componentes base renderizan.

---

## Precondiciones

- [ ] Cuentas creadas: Supabase, Cloudinary, Upstash, Vercel (ver `PASOS-MANUALES.md` Bloque 0)
- [ ] `.env.local` creado con al menos: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Node.js ≥ 18.17 instalado (`node --version`)
- [ ] Git inicializado en el proyecto

---

## Docs a leer antes de esta fase

```
/system/database/schema.md                ← estructura completa de las 28 tablas
/system/frontend/frontend-rules.md        ← reglas de estructura y layout
/system/design/system-design.md           ← tokens de diseño (colores, tipografía)
/system/backend/execution-model.md        ← pipeline del executor
/system/core/action-contract.md           ← contrato de actions
/system/constraints/global-rules.md       ← 16 reglas globales
```

---

## PASO 0.1 — Verificar schema.md

**Acción:** leer `/system/database/schema.md` completo de principio a fin.

El schema ya está validado. Verificar que entendés la estructura antes de ejecutar SQL:
- 28 tablas exactas
- `billing_webhook_log` sin RLS (solo service role)
- `events` con política INSERT only
- Trigger `updated_at` en las tablas indicadas (NO en: billing_payments, billing_webhook_log, product_categories, variant_attributes, variant_values, order_items, savings_movements, assistant_sessions, assistant_messages, events)

**Verificación:** confirmar mentalmente que entendés el orden de FK del Paso 0.6.

---

## PASO 0.2 — Inicializar proyecto Next.js

```bash
# En el directorio del repo
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Responder:
- Would you like to use Turbopack? → **No** (más estable para producción)

Instalar dependencias:
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install lucide-react
npm install @upstash/redis @upstash/ratelimit
npm install openai
npm install cloudinary
npm install next-themes
npm install sonner
```

Inicializar shadcn/ui:
```bash
npx shadcn@latest init
```
Seleccionar: style `default`, base color `slate`, CSS variables `yes`.

Instalar componentes shadcn/ui (uno por uno para detectar errores):
```bash
npx shadcn@latest add button input textarea select checkbox switch
npx shadcn@latest add dialog drawer sheet
npx shadcn@latest add toast sonner
npx shadcn@latest add badge skeleton table tabs card avatar
npx shadcn@latest add tooltip popover dropdown-menu
npx shadcn@latest add form label separator
```

**Verificación:** `npm run dev` → abre en `http://localhost:3000` sin errores en consola.

---

## PASO 0.3 — Tailwind con tokens del design system

**Archivo:** `tailwind.config.ts`

Reemplazar el contenido con (ver tokens exactos en `/system/design/system-design.md`):

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
        },
        success: { 50: '#F0FDF4', 500: '#22C55E' },
        warning: { 50: '#FFFBEB', 500: '#F59E0B' },
        error:   { 50: '#FEF2F2', 500: '#EF4444' },
        info:    { 50: '#EFF6FF', 500: '#3B82F6' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
```

En `src/app/layout.tsx`, agregar Inter:
```typescript
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Aplicar: className={`${inter.variable} font-sans`} en el body
```

**Verificación:** agregar `<div className="text-brand-500">test</div>` en la página y verificar que el color es violeta/indigo.

---

## PASO 0.4 — Estructura de carpetas

Crear la estructura de `/dev/quality/codigo.md` → sección "Estructura de carpetas".

Crear archivos vacíos con contenido mínimo:

```typescript
// Páginas placeholder
// src/app/(public)/[slug]/page.tsx
export default function StorefrontPage() {
  return <div>Vitrina — TODO: Fase 1</div>
}

// src/app/(admin)/admin/page.tsx
export default function AdminPage() {
  return <div>Dashboard — TODO: Fase 2</div>
}

// src/app/(admin)/admin/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>  // placeholder
}
```

```typescript
// src/lib/executor/registry.ts
import type { ActionHandler } from '@/lib/types'
const handlers = new Map<string, ActionHandler>()
export const registry = {
  register: (handler: ActionHandler) => handlers.set(handler.name, handler),
  get:      (name: string) => handlers.get(name),
}
```

```typescript
// src/lib/handlers/index.ts
// Registro de handlers — vacío en Fase 0
// Se importan los handlers aquí a medida que se implementan
```

**Verificación:** `npm run dev` sigue corriendo. No hay imports rotos.

---

## PASO 0.5 — Clientes de Supabase

Crear los 3 archivos usando los templates exactos de `/dev/infra/supabase.md` → sección "Patrones de cliente".

Archivos a crear:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`

**Verificación:** `npx tsc --noEmit` → 0 errores TypeScript.

---

## PASO 0.6 — Base de datos: ejecutar SQL

**Leer antes:** `/system/database/schema.md` completo.

**Derivar el SQL a partir del schema.md** siguiendo este orden de creación (dependencias de FK):

```
1.  EXTENSION uuid-ossp
2.  users
3.  plans
4.  stores (depende de plans)
5.  store_users (depende de stores, users)
6.  billing_payments (depende de stores, plans)
7.  billing_webhook_log (depende de stores)
8.  products (depende de stores)
9.  categories (depende de stores)
10. product_categories (depende de products, categories)
11. banners (depende de stores)
12. variant_attributes (depende de stores, products)
13. variants (depende de stores, products)
14. variant_values (depende de variants, variant_attributes)
15. stock_items (depende de stores, products, variants)
16. wholesale_prices (depende de stores, products, variants)
17. shipping_methods (depende de stores)
18. customers (depende de stores)
19. orders (depende de stores, customers)
20. order_items (depende de stores, orders, products, variants)
21. payments (depende de stores, orders)
22. finance_entries (depende de stores, orders, payments)
23. expenses (depende de stores, finance_entries)
24. savings_accounts (depende de stores)
25. savings_movements (depende de stores, savings_accounts, finance_entries)
26. tasks (depende de stores, users, orders)
27. assistant_sessions (depende de stores, users)
28. assistant_messages (depende de assistant_sessions, stores)
29. events (depende de stores)
30. Función trigger_set_updated_at
31. Triggers updated_at (en tablas con updated_at)
32. Índices (todos los de schema.md)
33. RLS (habilitar + políticas en todas las tablas de dominio)
```

**Reglas SQL obligatorias:**
- `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- `created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`
- `updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL`
- Precios en `INTEGER` (centavos)
- Ver template en `/dev/plantillas/sql-migration.md`

**Ejecutar en:** Supabase Dashboard → SQL Editor → New snippet → Run

**Verificación:**
```sql
-- Contar tablas (debe ser 28)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';

-- Verificar RLS
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
```

---

## PASO 0.7 — Tipos TypeScript del dominio

**Archivo:** `src/lib/types/index.ts`

Crear con los tipos de `/dev/quality/typescript.md` → sección "Tipos de dominio" + los tipos del executor de `PLAN-DE-DESARROLLO.md` Paso 0.7.

Tipos obligatorios:
- `ActorType`, `UserRole`, `StoreStatus`, `OrderStatus`, `ModuleName`, `ErrorCode`
- `ActionResult<T>`, `StoreContext`, `Actor`, `ExecutorParams`, `ActionHandler`

**Verificación:** `npx tsc --noEmit` → 0 errores.

---

## PASO 0.8 — Executor central

**Archivos:**
- `src/lib/executor/index.ts`
- `src/lib/executor/registry.ts` (ya creado en 0.4)

Implementar siguiendo exactamente el código de `PLAN-DE-DESARROLLO.md` Paso 0.8.
El executor es el componente más crítico — no improvizar, seguir el código documentado.

**Verificación:**
- El executor importa sin errores en un Server Component de prueba
- `registry.get('no-existe')` retorna `undefined`
- `npx tsc --noEmit` → 0 errores

---

## PASO 0.9 — Middleware de Next.js

**Archivo:** `src/middleware.ts`

Implementar siguiendo el código de `PLAN-DE-DESARROLLO.md` Paso 0.9.

**Verificación:**
- `GET /admin` sin cookie de sesión → redirige a `/login` (verificar en browser)
- El build no tiene errores

---

## PASO 0.10 — Componentes base del design system

**Archivos a crear** en `src/components/admin/`:

1. `shared/PageHeader.tsx`
2. `shared/StatusBadge.tsx`
3. `shared/EmptyState.tsx`
4. `shared/ModuleLockedState.tsx`
5. `shared/StatCard.tsx`
6. `shared/ConfirmDialog.tsx`
7. `layout/AdminLayout.tsx`
8. `layout/Sidebar.tsx`
9. `layout/BottomNav.tsx`

Seguir las specs de `PLAN-DE-DESARROLLO.md` Paso 0.10 y `/system/design/components.md`.

**Regla de layout responsive (Regla 12 del frontend):**
- Mobile (< 768px): muestra `BottomNav` en la parte inferior
- Desktop (≥ 768px): muestra `Sidebar` lateral

**Verificación:**
- Navegar a `/admin` en el browser → componentes visibles sin errores de consola
- Redimensionar a 375px → BottomNav visible, Sidebar oculto

---

## PASO 0.11 — TanStack Query Provider

**Archivos:**
- `src/app/providers.tsx`

Implementar siguiendo el código de `PLAN-DE-DESARROLLO.md` Paso 0.11.

Envolver el root layout (`src/app/layout.tsx`) con `<Providers>`.

**Verificación:**
- En desarrollo: ReactQuery Devtools aparece (botón flotante abajo a la derecha)
- No hay errores de hidratación en la consola del browser

---

## Checklist de completitud de Fase 0

```
[ ] npm run dev funciona sin errores de consola
[ ] npx tsc --noEmit → 0 errores TypeScript
[ ] npm run build → build exitoso
[ ] 28 tablas en Supabase (verificado con SQL)
[ ] RLS habilitado en todas las tablas de dominio
[ ] 3 clientes de Supabase compilan
[ ] Executor importable desde Server Components
[ ] Registry vacío (no hay handlers registrados)
[ ] /admin sin sesión → redirige a /login
[ ] 8 componentes admin base renderizan en /admin
[ ] TanStack Query devtools visibles en dev
[ ] Colores brand-500, success-500, error-500 funcionan en Tailwind
```

---

## Al finalizar esta fase

1. Actualizar `ESTADO.md`:
   - Marcar todos los pasos 0.1–0.11 como ✅
   - Fase 0 como ✅ completada
   - Fase 1 como 🔄 lista para comenzar
2. Commit: `feat(fase-0): fundación técnica completa`
3. → Siguiente: [`/dev/fases/F1-producto-base.md`](/dev/fases/F1-producto-base.md)
