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
| Catálogo público | `/(public)/[slug]/*` | Clientes de la tienda | PublicLayout |
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
│   ├── public/                     → componentes del catálogo público
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

10. **Renders estratégicos.** Catálogo público: SSR + ISR. Panel: Client Components + TanStack Query. Layout/nav: Server Components.

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

Tipografía: Inter (Google Fonts). Logo: `/logo.jpg`. OG Image: `/og-image.jpg`.

---

## Patrones de UI Premium (nivel F15)

### Admin Shell

La estructura del admin sigue este layout:

```
┌─────────────────────────────────────────────┐
│ AdminTopbar (h-11, sticky top-0, z-40)       │  ← solo mobile: [☰] + título + [Ver catálogo] + [Avatar]
│ BillingBanner (optional, debajo del topbar)  │  ← amber si demo, rojo si past_due
├──────────┬──────────────────────────────────┤
│ Sidebar  │  Main content                    │
│ (w-52,   │  (flex-1, overflow-y-auto)        │
│  desktop │                                  │
│  only)   │                                  │
└──────────┴──────────────────────────────────┘
```

- El sidebar es sticky `h-screen` en desktop. En mobile: Sheet lateral abierto por `AdminTopbar`.
- `AdminTopbar` solo visible en mobile (hidden `lg:hidden`). Desktop tiene topbar mínimo solo con título de sección.
- Sidebar header: logo/avatar tienda + nombre + badge estado billing.
- Sidebar footer: "Ver catálogo" (ExternalLink) + "Cerrar sesión" (LogOut).

### EntityToolbar

Componente ubicado en `src/components/shared/entity-toolbar.tsx`.

Cada sección de lista DEBE tener `EntityToolbar` como primer elemento del contenido:
- Búsqueda inline con debounce.
- Botón filtros → Sheet lateral `FilterSheet` con filtros específicos por entidad.
- Menú "..." → Exportar PDF / Exportar CSV / Importar CSV.

`filterPreset` disponibles: `'generic' | 'productos' | 'pedidos' | 'ventas' | 'cuenta' | 'stock' | 'envios' | 'finanzas' | 'banners' | 'tareas'`.

### Sheets en lugar de páginas separadas

Para editar/ver detalles de entidades, usar Sheet (desliza desde el lado derecho) en lugar de navegar a una página separada. Excepciones: acciones que requieren contexto completo de pantalla (ej: configuración general de tienda).

Patrón estándar:
```tsx
const [selectedId, setSelectedId] = useState<string | null>(null)
// ... lista de items con onClick={() => setSelectedId(item.id)}
<EntitySheet id={selectedId} open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)} />
```

### Vitrine (catálogo público)

La vitrine aplica `primary_color` del store como color de acento:
- Botones de categoría activos, botón carrito, avatar inicial del header.
- Trust badges solo si módulo `shipping` activo.
- Compare price: si `compare_price` existe y es mayor que `price`, mostrar precio tachado + badge "X% OFF".
- Sin stock: overlay "Sin stock" semi-transparente sobre la imagen. Botón deshabilitado.

### Layout de secciones admin

Cada página admin sigue esta estructura:

```tsx
<div className="p-4 sm:p-6 space-y-4">
  {/* Header de sección */}
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold">Nombre sección</h2>
      <p className="text-sm text-muted-foreground">{total} items</p>
    </div>
    <Button size="sm"><Plus />Nuevo</Button>
  </div>

  {/* EntityToolbar */}
  <EntityToolbar ... />

  {/* Contenido: tabla o cards */}
  {isLoading ? <SkeletonList /> : items.length === 0 ? <EmptyState /> : <ItemList />}

  {/* Paginación */}
  {totalPages > 1 && <EntityListPagination ... />}
</div>
```

### Regla de tamaños y espaciado

- Padding de página: `p-4 sm:p-6`.
- Gap entre secciones: `space-y-4`.
- Botones en header: `size="sm"` (h-8).
- Textos de tabla: `text-sm`.
- Badges de estado: `text-xs`.
- Íconos de acción en fila: `h-3.5 w-3.5`.
- Input de búsqueda: `h-9` en desktop, `h-10` en mobile.

### Calidad visual (nivel Apple)

- Nunca usar texto gris claro sobre fondo blanco sin suficiente contraste.
- Rounded-xl o rounded-2xl para cards. Rounded-lg para inputs/buttons.
- Shadow mínima: `shadow-xs` en cards. No usar `shadow-lg` en elementos inline.
- Animaciones: solo fade-in con duración 150–200ms para aparición de elementos. No animar el scroll.
- Hover states: `hover:bg-muted` o `hover:border-foreground/25`. Siempre con `transition-colors`.
- Skeleton loaders con la misma estructura que el contenido real (no bloques genéricos).
