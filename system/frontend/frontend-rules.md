# Frontend Rules — KitDigital.AR

## Propósito

Este archivo define los principios y reglas que rigen toda la capa de frontend del sistema.

No contiene lógica de negocio de módulos ni reglas de dominio.
Define cómo se estructura, organiza y comporta la interfaz de usuario.

→ Sistema de diseño: `/system/design/system-design.md`
→ Componentes UI: `/system/design/components.md`
→ Reglas globales del sistema: `/system/constraints/global-rules.md`

---

## Tecnología Base

- **Next.js 15 App Router** — estructura de rutas y rendering
- **TypeScript** — tipado estricto en todo el frontend
- **Tailwind CSS** — estilos utilitarios
- **shadcn/ui** — componentes base accesibles
- **TanStack Query v5** — data fetching, cache y sincronización
- **Zustand** — estado global de UI (no estado de servidor)
- **React Hook Form + Zod** — formularios con validación de tipos

---

## Regla 1 — Mobile-First, siempre

**Todo componente se diseña primero para mobile, luego se adapta a desktop.**

El dueño de tienda gestiona su negocio principalmente desde el celular.
No existe "versión mobile" y "versión desktop": existe un solo diseño que funciona en ambos.

```
✅ Base: mobile (< 768px)
✅ md:  tablet  (768px - 1024px)
✅ lg:  desktop (> 1024px)
❌ NUNCA: "solo visible en desktop", "oculto en mobile"
```

Si un componente es "demasiado complejo" para mobile, el problema es el diseño, no el dispositivo.

---

## Regla 2 — Tres superficies, tres layouts

El sistema tiene tres superficies de UI completamente separadas:

| Superficie | Ruta base | Audiencia | Layout |
|-----------|-----------|-----------|--------|
| Vitrina pública | `/{slug}/*` | Clientes de la tienda | `PublicLayout` |
| Panel de gestión | `/admin/*` | Dueño + equipo de la tienda | `AdminLayout` |
| Panel superadmin | `/superadmin/*` | Operador de KitDigital | `SuperadminLayout` |

Cada superficie tiene su propio layout raíz. **No comparten componentes de layout** (header, nav, sidebar). Sí pueden compartir componentes UI primitivos (botones, inputs, tablas).

---

## Regla 3 — Estructura de carpetas

```
/app
  /(public)
    /[slug]/             → vitrina pública de cada tienda
      /page.tsx          → home / catálogo
      /[category]/       → categoría
      /p/[id]/           → página de producto (si módulo product_page activo)
      /cart/             → carrito
  /(admin)
    /admin/
      /layout.tsx        → AdminLayout (auth guard)
      /page.tsx          → dashboard
      /products/
      /categories/
      /orders/
      /[...módulos]/
      /settings/
      /billing/
  /(superadmin)
    /superadmin/
      /layout.tsx        → SuperadminLayout (superadmin guard)
      /[...secciones]/

/components
  /ui/                   → primitivos (Button, Input, Modal, etc.) — shadcn/ui base
  /admin/                → componentes específicos del panel de gestión
  /public/               → componentes específicos de la vitrina
  /shared/               → componentes compartidos entre superficies

/lib
  /hooks/                → hooks de datos (TanStack Query)
  /stores/               → stores de Zustand (UI state)
  /utils/                → utilidades puras (sin side effects)
  /validations/          → esquemas Zod compartidos con el backend
```

---

## Regla 4 — Data fetching con TanStack Query

**Todo fetch de datos del servidor usa TanStack Query.**
No se usa `fetch` directo en componentes. No se usa `useEffect` para fetching.

```typescript
// ✅ CORRECTO
const { data: products, isLoading } = useQuery({
  queryKey: ['products', storeId],
  queryFn: () => getProducts(storeId),
})

// ❌ INCORRECTO
useEffect(() => {
  fetch('/api/products').then(r => r.json()).then(setProducts)
}, [])
```

Las mutation (creates, updates, deletes) usan `useMutation` con `invalidateQueries` del recurso afectado.

---

## Regla 5 — Estado de UI vs. Estado de servidor

**Zustand solo para estado de UI.** El estado del servidor vive en TanStack Query.

| Tipo de estado | Dónde vive |
|---------------|-----------|
| Datos de la tienda (productos, pedidos, etc.) | TanStack Query |
| Sesión del usuario | Supabase Auth + contexto de React |
| Contexto de la tienda activa (store_id, módulos) | Contexto de React (StoreContext) |
| Estado del panel (sidebar abierto, tab activo, modal visible) | Zustand |
| Formularios | React Hook Form (estado local) |
| Datos efímeros de un componente | useState local |

---

## Regla 6 — Formularios con React Hook Form + Zod

**Todo formulario que envía datos al servidor usa React Hook Form con validación Zod.**

El esquema Zod es el mismo que usa el backend para validar el formato del input.
Esto garantiza que las validaciones de formato son consistentes cliente/servidor.

```typescript
const schema = z.object({
  name:  z.string().min(1).max(200),
  price: z.number().int().min(0),
})

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
})
```

Los errores de validación de negocio (del executor) se muestran en el formulario mapeando el campo del error al input correspondiente.

---

## Regla 7 — Módulos inactivos: UI consistente

**Si un módulo está inactivo, su sección en el panel muestra un estado "bloqueado" uniforme**, no un 404 ni una página vacía.

El estado bloqueado:
- Muestra el nombre y descripción del módulo
- Indica que el módulo no está activo
- Muestra el botón "Activar módulo" (si el usuario tiene permiso)
- No muestra ningún dato del módulo

El frontend lee `store.modules` del `StoreContext` para determinar qué mostrar. No hace un fetch extra para verificar si el módulo está activo.

---

## Regla 8 — Optimistic updates para acciones de alta frecuencia

Las acciones que el usuario repite muchas veces (toggle activo/inactivo de producto, marcar pedido como entregado) usan **optimistic updates** con TanStack Query:

1. El estado cambia inmediatamente en la UI.
2. Se envía la mutation al servidor.
3. Si la mutation falla → se revierte el estado y se muestra el error.

Para acciones con consecuencias graves (eliminar, cancelar pedido) **no** se usan optimistic updates: se espera la respuesta del servidor.

---

## Regla 9 — Manejo de errores visible y consistente

**Todo error del sistema se muestra al usuario de forma clara y no técnica.**

| Tipo de error | Cómo se muestra |
|--------------|----------------|
| Error de validación de campo | Debajo del campo afectado |
| Error de negocio (`MODULE_INACTIVE`, `LIMIT_EXCEEDED`) | Toast + descripción + acción sugerida |
| Error de red / servidor caído | Banner global "Sin conexión. Reintentando..." |
| `UNAUTHORIZED` | Redirect a login |
| `STORE_INACTIVE` | Página de tienda suspendida con CTA de pago |
| `NOT_FOUND` | Página 404 con navegación de vuelta |

Nunca se muestra al usuario un stack trace, un código de error técnico ni un JSON crudo.

---

## Regla 10 — Loading states explícitos

**Todo estado de carga tiene un skeleton o spinner visible.**

- Listas: skeleton de N filas con el mismo layout que el contenido real
- Formularios: botón de submit con estado `loading` (spinner + disabled)
- Páginas completas: skeleton del layout de la página, no un spinner centrado

No existe la pantalla en blanco mientras carga. El usuario siempre sabe que algo está pasando.

---

## Regla 11 — Accesibilidad básica obligatoria

Todos los componentes interactivos cumplen:

- Labels asociados a inputs (`htmlFor` / `aria-label`)
- Botones con texto descriptivo (no solo íconos sin `aria-label`)
- Focus visible en todos los elementos interactivos
- Contraste mínimo WCAG AA (4.5:1 para texto normal)
- Navegación por teclado funcional en formularios y modales

No se apunta a WCAG AAA, pero sí a que el panel sea usable con teclado.

---

## Regla 12 — Renders server-side estratégicos

| Superficie | Estrategia de render |
|-----------|---------------------|
| Vitrina pública (catálogo, producto) | Server Components + ISR (revalidación cada 60 segundos) |
| Vitrina pública (carrito) | Client Component (estado local) |
| Panel de gestión (datos) | Client Components con TanStack Query |
| Panel de gestión (layout / nav) | Server Components |
| Panel superadmin | Client Components con TanStack Query |

La vitrina pública prioriza la velocidad de carga y el SEO para los clientes de las tiendas.
El panel de gestión prioriza la interactividad.

---

## Regla 13 — Internacionalización: español por defecto

El sistema está en español (Argentina). No existe soporte multi-idioma en Fase 0.

- Los textos de UI **no** se hardcodean directamente en los componentes. Se usan constantes en `/lib/copy/` para facilitar futuras traducciones.
- Los formatos de fecha usan `es-AR` como locale.
- Los precios se muestran en ARS con formato `$ X.XXX,XX`.

---

## Regla 14 — Autenticación y guards de ruta

**El middleware de Next.js gestiona los guards de autenticación.**

```
/admin/*        → requiere sesión + store_id válido resuelto
/superadmin/*   → requiere sesión + role === 'superadmin'
/{slug}/*       → público (sin auth requerida)
```

No se implementan guards en los componentes. Los guards están exclusivamente en el middleware.
Si el middleware permite el acceso, el componente puede asumir que el usuario está autenticado.

---

## Regla 15 — Performance básica

- **Imágenes**: siempre con `next/image`. Nunca con `<img>` directo.
- **Fonts**: cargar solo los pesos necesarios con `next/font`.
- **Bundle**: no importar librerías pesadas para funcionalidad mínima (ej: no importar `lodash` entero para un `debounce`).
- **Lazy loading**: los módulos del panel de gestión que no son del CORE se cargan con `dynamic()` (lazy).
- **Listas largas**: implementar virtualización (TanStack Virtual) para listas de más de 100 ítems.
