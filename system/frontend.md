# Frontend — Reglas, Estructura y Design System

---

## Stack

- Next.js 15 App Router, TypeScript estricto
- Tailwind CSS v3, shadcn/ui (default/slate), next-themes
- TanStack Query v5 (data fetching), Zustand (estado UI)
- React Hook Form + Zod (formularios)
- Lucide React (íconos), sonner (toasts)

---

## Tres Superficies

| Superficie | Rutas | Audiencia | Layout |
|-----------|-------|-----------|--------|
| Vitrina pública | `/(public)/[slug]/*` | Clientes de la tienda | PublicLayout |
| Panel admin | `/(admin)/admin/*` | Dueño + equipo | AdminLayout |
| Panel superadmin | `/(superadmin)/superadmin/*` | Operador KitDigital | SuperadminLayout |

Cada superficie tiene su propio layout raíz. No comparten header ni nav. Sí comparten componentes primitivos (Button, Input, DataTable).

---

## Estructura de Carpetas

```
src/
├── app/
│   ├── (public)/[slug]/
│   │   ├── page.tsx                → catálogo
│   │   ├── [category]/page.tsx     → categoría
│   │   └── p/[id]/page.tsx         → producto
│   ├── (public)/tracking/
│   │   └── [code]/page.tsx         → seguimiento de envío
│   ├── (public)/invite/
│   │   └── [token]/page.tsx        → aceptar invitación
│   ├── (admin)/admin/
│   │   ├── layout.tsx              → AdminLayout
│   │   ├── page.tsx                → dashboard
│   │   ├── products/
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── stock/
│   │   ├── payments/
│   │   ├── finance/
│   │   ├── expenses/
│   │   ├── savings/
│   │   ├── tasks/
│   │   ├── banners/
│   │   ├── shipping/
│   │   ├── settings/
│   │   └── billing/
│   ├── (superadmin)/superadmin/
│   │   ├── layout.tsx
│   │   ├── stores/
│   │   ├── plans/
│   │   ├── events/
│   │   └── metrics/
│   ├── api/webhooks/mercadopago/
│   └── providers.tsx
├── components/
│   ├── ui/                         → shadcn base
│   ├── admin/                      → componentes de panel
│   ├── public/                     → componentes de vitrina
│   └── shared/                     → compartidos (DataTable, EmptyState, etc.)
├── lib/
│   ├── supabase/                   → clients (browser, server, service-role)
│   ├── executor/                   → index.ts, registry.ts
│   ├── hooks/                      → TanStack Query hooks
│   ├── stores/                     → Zustand stores
│   ├── utils/                      → currency, date, format
│   ├── validations/                → Zod schemas
│   ├── db/queries/                 → funciones de lectura
│   ├── billing/                    → MP integration
│   └── types/                      → database.ts, index.ts
└── middleware.ts
```

---

## Reglas de Frontend

1. **Mobile-first.** Todo se diseña primero para móvil. Breakpoints: `sm` (640), `md` (768), `lg` (1024), `xl` (1280).

2. **Data fetching solo con TanStack Query.** Nunca `fetch` directo ni `useEffect` para fetching.

3. **Zustand solo para UI.** Datos del servidor en TanStack Query. Zustand para: carrito, modales, sidebar, notificaciones.

4. **Formularios con RHF + Zod.** El schema Zod es compartido con el backend para consistencia.

5. **Módulo inactivo = UI bloqueada.** `ModuleGate` muestra `ModuleLockedState`, no 404.

6. **Optimistic updates** para acciones frecuentes y reversibles. No para acciones destructivas o de billing.

7. **Errores visibles y no técnicos.** Toast para errores de negocio. Banner global para errores de red. Nunca stack traces ni JSON crudo al usuario.

8. **Loading states explícitos.** Skeleton por sección. Botón submit con spinner + disabled. Nunca pantalla en blanco.

9. **Accesibilidad básica.** Labels en inputs, focus visible, contraste WCAG AA, navegación por teclado en formularios y modales.

10. **Renders estratégicos.** Vitrina: SSR + ISR. Panel: Client Components + TanStack Query. Layout/nav: Server Components.

11. **Imágenes con next/image.** Nunca `<img>` directo.

12. **Lazy loading de módulos no-core.** `dynamic()` para secciones de módulos avanzados.

13. **Virtualización** para listas de más de 100 ítems (TanStack Virtual).

14. **Textos en constantes** en `src/lib/copy/` para facilitar futuras traducciones. Locale: `es-AR`.

15. **Guards de ruta en middleware.** No en componentes. Si el middleware permite el acceso, el componente asume autenticación.

---

## Rutas públicas con datos sensibles (`/tracking/[code]`, `/invite/[token]`)

No hay política RLS que permita al cliente `anon` leer `shipments` ni `store_invitations` completos. Implementación obligatoria:

- **Server Component o Route Handler** que llame solo a `get_shipment_public` / flujo de invitación usando **`supabaseServiceRole`** (o RPC `SECURITY DEFINER` que devuelva un DTO mínimo).
- **Prohibido:** usar `createBrowserClient` + `anon` contra esas tablas.
- La página solo renderiza el DTO (estado de envío, nombre tienda, etc.); nunca filas crudas ni columnas internas.

---

## Tokens de Diseño

```
brand:   { DEFAULT, light, dark }    → configurados por el humano en pausa de diseño
success: { DEFAULT: '#22c55e', light: '#f0fdf4' }
warning: { DEFAULT: '#f59e0b', light: '#fffbeb' }
error:   { DEFAULT: '#ef4444', light: '#fef2f2' }
```

Tipografía, logo y favicon se definen en la pausa de diseño.
