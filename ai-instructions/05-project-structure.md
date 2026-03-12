# Estructura de Carpetas del Proyecto

Este documento define la **estructura exacta** de carpetas y archivos del proyecto. Úsala como referencia al crear nuevos archivos.

> **⚠️ IMPORTANTE**: No inventes rutas ni nombres. Usa exactamente los que aparecen aquí.

## Árbol completo de directorios

```
kitdigital.ar/
│
├── ai-instructions/              # ← IA lee esto PRIMERO
│   ├── 00-skills.md
│   ├── 01-master-document.md
│   ├── 02-schema.sql
│   ├── 03-references.md
│   ├── 04-implementation-order.md
│   ├── 05-project-structure.md   # ← Este archivo
│   ├── CHANGELOG.md
│   └── specs/
│       ├── spec-01-multitenancy-middleware.md
│       ├── spec-02-onboarding-ia.md
│       ├── spec-03-modulos-potenciadores.md
│       ├── spec-04-panel-admin.md
│       ├── spec-05-vitrina-publica.md
│       ├── spec-06-stock-y-ventas.md
│       └── spec-07-superadmin.md
│
├── docs/                          # Para humanos
│   ├── Documento-Tecnico-Fundamental.md
│   └── schema.sql
│
├── .cursor/                       # Configuración Cursor
│   └── rules/
│       └── ai-instructions.mdc
│
├── app/                           # Next.js 15 App Router
│   │
│   ├── (public)/                  # Grupo de rutas: Vitrina pública
│   │   └── [tenant]/              # Dynamic route: slug del tenant
│   │       ├── layout.tsx         # Layout de Mi Vitrina (público)
│   │       ├── page.tsx           # Catálogo (home)
│   │       ├── producto/
│   │       │   └── [productId]/
│   │       │       └── page.tsx   # Detalle de producto
│   │       ├── mayorista/
│   │       │   └── page.tsx       # Condicionado a módulo
│   │       └── _components/       # Componentes privados de esta ruta
│   │           ├── CatalogHeader.tsx
│   │           ├── ProductGrid.tsx
│   │           ├── CartDrawer.tsx
│   │           └── WhatsAppCheckoutButton.tsx
│   │
│   ├── (admin)/                   # Grupo de rutas: Panel Admin
│   │   ├── layout.tsx             # Shell del Panel Admin
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Dashboard principal
│   │   ├── productos/
│   │   │   ├── page.tsx           # Lista de productos
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx       # Crear producto
│   │   │   └── [productId]/
│   │   │       └── editar/
│   │   │           └── page.tsx  # Editar producto
│   │   ├── categorias/
│   │   │   └── page.tsx           # Gestión de categorías
│   │   ├── portada-principal/
│   │   │   └── page.tsx           # Editor de Portada Principal
│   │   ├── modulos-potenciadores/
│   │   │   └── page.tsx           # Toggles de módulos
│   │   ├── pedidos/
│   │   │   └── page.tsx           # Lista de pedidos (WhatsApp)
│   │   └── configuracion/
│   │       └── page.tsx           # Configuración general
│   │
│   ├── (superadmin)/              # Grupo de rutas: Superadmin
│   │   ├── layout.tsx             # Layout de Superadmin
│   │   ├── tenants/
│   │   │   ├── page.tsx           # Lista de tenants
│   │   │   └── [tenantId]/
│   │   │       └── page.tsx       # Detalle de tenant
│   │   ├── centro-de-datos/
│   │   │   └── page.tsx          # Dashboard de métricas
│   │   └── _components/          # Componentes privados
│   │       ├── TenantTable.tsx
│   │       └── ImpersonateButton.tsx
│   │
│   ├── (auth)/                    # Grupo de rutas: Autenticación
│   │   ├── login/
│   │   │   └── page.tsx           # Página de login
│   │   └── callback/
│   │       └── page.tsx           # Callback de OAuth
│   │
│   ├── api/                       # API Routes
│   │   ├── health/
│   │   │   └── route.ts           # Health check
│   │   └── mp/
│   │       └── webhook/
│   │           └── route.ts       # Webhook Mercado Pago
│   │
│   ├── globals.css                # Estilos globales
│   └── layout.tsx                 # Root layout
│
├── components/                     # Componentes compartidos
│   ├── ui/                        # shadcn/ui (copiado)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── drawer.tsx
│   │   └── ...                    # Más componentes shadcn/ui
│   ├── AppShell.tsx               # Shell principal (layout compartido)
│   ├── MobileNav.tsx              # Navegación mobile
│   └── LoadingSkeletons.tsx       # Skeletons de carga
│
├── lib/                            # Utilidades y helpers
│   ├── supabase/
│   │   ├── client.ts              # Browser client (anon key)
│   │   ├── server.ts              # Server client (cookies/headers)
│   │   └── types.ts               # DB types (generados con supabase gen types)
│   │
│   ├── tenant/
│   │   ├── resolveTenant.ts       # Resolución por host/slug
│   │   └── tenantContext.ts       # Helpers de contexto
│   │
│   ├── modules/
│   │   ├── moduleKeys.ts          # Union type de module keys
│   │   └── moduleAccess.ts        # Helpers de gating (check si módulo activo)
│   │
│   ├── whatsapp/
│   │   └── buildMessage.ts        # Builder de mensaje WhatsApp
│   │
│   └── money/
│       └── formatARS.ts           # Formateo de moneda ARS
│
├── hooks/                          # React Hooks personalizados
│   ├── useTenant.ts               # Hook para obtener tenant actual
│   ├── useModules.ts              # Hook para módulos activos
│   └── useCart.ts                 # Hook para carrito
│
├── types/                          # Tipos TypeScript
│   ├── domain.ts                  # Tipos de dominio (Tenant, Product, etc.)
│   └── modules.ts                 # Tipos relacionados a módulos
│
├── middleware.ts                  # Vercel Middleware (resolución de tenant)
│
├── .env.example                    # Template de variables de entorno
├── README.md                       # Para devs humanos
├── DEVELOPMENT.md                  # Guía de desarrollo con IA
│
└── (archivos de configuración Next.js)
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── package.json
```

## Convenciones de nombres

### Archivos y carpetas
- **Rutas**: kebab-case (`modulos-potenciadores`, `portada-principal`)
- **Componentes**: PascalCase (`ProductGrid.tsx`, `CartDrawer.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useTenant.ts`, `useModules.ts`)
- **Utilidades**: camelCase (`resolveTenant.ts`, `buildMessage.ts`)
- **Tipos**: camelCase (`domain.ts`, `modules.ts`)

### Grupos de rutas (route groups)
- `(public)`: Rutas públicas (Mi Vitrina)
- `(admin)`: Rutas del panel admin
- `(superadmin)`: Rutas del superadmin
- `(auth)`: Rutas de autenticación

### Carpetas especiales
- `_components/`: Componentes privados de una ruta específica
- `[tenant]`: Dynamic route para slug del tenant
- `[productId]`: Dynamic route para ID de producto
- `[tenantId]`: Dynamic route para ID de tenant (superadmin)

## Notas importantes

1. **No inventes rutas**: Si necesitas una nueva ruta, primero actualiza este documento.
2. **Grupos de rutas**: Los paréntesis `()` en Next.js no crean segmentos de URL, solo organizan.
3. **Componentes privados**: `_components/` es una convención para componentes que solo se usan en esa ruta.
4. **Dynamic routes**: Usa `[param]` para rutas dinámicas. El nombre del parámetro debe ser descriptivo.

## Referencias

- **Master Document**: `@/ai-instructions/01-master-document.md` (sección 6.2)
- **Orden de implementación**: `@/ai-instructions/04-implementation-order.md`

