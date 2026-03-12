# ORDEN DE IMPLEMENTACIÓN (seguir estrictamente este orden)

> **⚠️ REGLA CRÍTICA**: Nunca avances al siguiente punto si el anterior no está 100% terminado y testeado.

## Fase 0: Documentación (✅ COMPLETADA)

- [x] Documento Técnico Fundamental creado
- [x] Schema SQL completo creado
- [x] Estructura `ai-instructions/` configurada

---

## Fase 1: Base (Configuración inicial)

### 1.1 Configurar proyecto Next.js 15
- [ ] Inicializar proyecto Next.js 15 con App Router
- [ ] Configurar TypeScript estricto (`tsconfig.json`)
- [ ] Instalar dependencias base: Tailwind, shadcn/ui, TanStack Query
- [ ] Configurar `.env.example` con todas las variables necesarias

### 1.2 Crear carpeta `ai-instructions/` y pegar todos los archivos
- [x] Estructura creada (FASE 1 completada)

### 1.3 Middleware + resolución de tenant
- [ ] Crear `middleware.ts` en root
- [ ] Implementar resolución de tenant por subdominio
- [ ] Implementar resolución de tenant por dominio custom
- [ ] Setear contexto de tenant (headers/cookies) para SSR
- [ ] Manejar rutas inválidas (404)

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-01-multitenancy-middleware.md`
- `@/ai-instructions/01-master-document.md` (sección 3.4)

### 1.4 Tipos generados de Supabase
- [ ] Instalar `supabase` CLI
- [ ] Generar tipos: `supabase gen types typescript --project-id <id> > lib/supabase/types.ts`
- [ ] Verificar que tipos estén correctos
- [ ] Crear helpers de tipos en `types/domain.ts`

**Referencias obligatorias**:
- `@/ai-instructions/02-schema.sql`

---

## Fase 2: Core (Funcionalidad base)

### 2.1 Onboarding con IA
- [ ] Crear Edge Function `onboarding-ai` en Supabase
- [ ] Implementar prompt a GPT-4o-mini
- [ ] Crear UI de onboarding (3 pasos)
- [ ] Integrar Edge Function con frontend
- [ ] Verificar creación de tenant + seed de datos

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-02-onboarding-ia.md`
- `@/ai-instructions/01-master-document.md` (sección 7.1)

### 2.2 Sistema de Módulos + toggles
- [ ] Crear tabla `tenant_modules` (ya existe en schema)
- [ ] Crear hook `useModules()`
- [ ] Crear componente `ModuleToggle`
- [ ] Implementar página `app/(admin)/modulos-potenciadores/page.tsx`
- [ ] Implementar lógica de activación/desactivación
- [ ] Verificar que módulos se guarden correctamente

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-03-modulos-potenciadores.md`
- `@/ai-instructions/01-master-document.md` (sección 5)

### 2.3 Panel Admin básico (layout + dashboard)
- [ ] Crear layout de admin `app/(admin)/layout.tsx`
- [ ] Implementar navegación mobile-first
- [ ] Crear dashboard básico `app/(admin)/dashboard/page.tsx`
- [ ] Implementar autenticación (Supabase Auth)
- [ ] Verificar que claims `tenant_id` y `role` funcionen

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-04-panel-admin.md`
- `@/ai-instructions/01-master-document.md` (sección 6)

---

## Fase 3: Vitrina Pública (Mi Vitrina)

### 3.1 Ruta `[tenant]/` y ProductGrid
- [ ] Crear layout público `app/(public)/[tenant]/layout.tsx`
- [ ] Implementar resolución de tenant por slug
- [ ] Crear página home `app/(public)/[tenant]/page.tsx`
- [ ] Implementar componente `ProductGrid`
- [ ] Implementar filtros por categoría
- [ ] Verificar que productos se muestren correctamente

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-05-vitrina-publica.md`
- `@/ai-instructions/01-master-document.md` (sección 6.2)

### 3.2 Carrito + WhatsApp
- [ ] Crear componente `CartDrawer`
- [ ] Implementar estado local del carrito (persistencia)
- [ ] Crear componente `WhatsAppCheckoutButton`
- [ ] Implementar builder de mensaje WhatsApp (`lib/whatsapp/buildMessage.ts`)
- [ ] Crear registro de pedidos (`orders` + `order_items`)
- [ ] Verificar flujo completo: carrito → WhatsApp → registro

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-05-vitrina-publica.md`
- `@/ai-instructions/01-master-document.md` (sección 7.2)

---

## Fase 4: Módulos (Stock y Ventas)

### 4.1 Módulo Stock
- [ ] Verificar que módulo se active/desactive correctamente
- [ ] Crear UI de gestión de stock
- [ ] Implementar movimientos de stock
- [ ] Integrar stock con productos
- [ ] Verificar que stock se sincronice con ventas

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-06-stock-y-ventas.md`
- `@/ai-instructions/02-schema.sql` (tablas `stock_items`, `stock_movements`)

### 4.2 Módulo Ventas
- [ ] Crear UI de registro de ventas
- [ ] Implementar sincronización con stock (si módulo activo)
- [ ] Crear reportes básicos
- [ ] Verificar que ventas se registren correctamente

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-06-stock-y-ventas.md`
- `@/ai-instructions/02-schema.sql` (tabla `sales`)

---

## Fase 5: Superadmin

### 5.1 Panel Superadmin
- [ ] Crear layout de superadmin `app/(superadmin)/layout.tsx`
- [ ] Implementar verificación de rol `superadmin`
- [ ] Crear página de listado de tenants
- [ ] Implementar búsqueda y filtros
- [ ] Verificar que RLS permita acceso a todos los tenants

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-07-superadmin.md`
- `@/ai-instructions/01-master-document.md` (sección 8)

### 5.2 Impersonación
- [ ] Implementar botón "Impersonar" en lista de tenants
- [ ] Crear contexto de impersonación
- [ ] Verificar que impersonación funcione correctamente
- [ ] (Opcional) Implementar auditoría de impersonación

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-07-superadmin.md`
- `@/ai-instructions/01-master-document.md` (sección 7.4)

### 5.3 Centro de Datos
- [ ] Integrar PostHog (self-hosted)
- [ ] Crear dashboard de métricas
- [ ] Implementar gráficos de revenue
- [ ] Mostrar módulos más usados
- [ ] Verificar que datos se muestren correctamente

**Referencias obligatorias**:
- `@/ai-instructions/specs/spec-07-superadmin.md`
- `@/ai-instructions/01-master-document.md` (sección 8.5)

---

## Fase 6: Suscripciones (Mercado Pago)

### 6.1 Integración Mercado Pago
- [ ] Configurar credenciales de Mercado Pago
- [ ] Crear webhook `app/api/mp/webhook/route.ts`
- [ ] Implementar creación de suscripciones
- [ ] Sincronizar estado de suscripciones con `tenants.plan_product_limit`
- [ ] Verificar que webhooks funcionen correctamente

**Referencias obligatorias**:
- `@/ai-instructions/01-master-document.md` (sección 7.3)
- `@/ai-instructions/02-schema.sql` (tabla `subscriptions`)

---

## Fase 7: Módulos adicionales

### 7.1 Módulo Finanzas
- [ ] Crear UI de gestión de finanzas
- [ ] Implementar registro de ingresos/gastos
- [ ] Crear reportes básicos
- [ ] Verificar que transacciones se registren correctamente

### 7.2 Módulo Mayorista
- [ ] Crear ruta `/mayorista` (condicionada a módulo)
- [ ] Implementar gestión de clientes mayoristas
- [ ] Crear precios mayoristas
- [ ] Verificar que precios se muestren correctamente

### 7.3 Módulo Variantes y Marcas
- [ ] Crear UI de gestión de variantes
- [ ] Implementar relación productos-variantes
- [ ] Crear gestión de marcas
- [ ] Verificar que variantes funcionen en carrito

---

## Fase 8: Optimización y Deploy

### 8.1 Optimizaciones
- [ ] Implementar caching con TanStack Query
- [ ] Optimizar imágenes (Next.js Image)
- [ ] Implementar lazy loading de módulos
- [ ] Verificar performance en mobile

### 8.2 Deploy
- [ ] Configurar Vercel (wildcard subdomains)
- [ ] Configurar variables de entorno
- [ ] Ejecutar `02-schema.sql` en Supabase
- [ ] Verificar que todo funcione en producción
- [ ] Configurar PostHog (self-hosted)

**Referencias obligatorias**:
- `@/ai-instructions/01-master-document.md` (sección 8)

---

## Notas importantes

- **Nunca saltes fases**: Cada fase depende de la anterior.
- **Testea cada fase**: Antes de avanzar, verifica que todo funcione.
- **Consulta specs**: Cada fase tiene su spec correspondiente con detalles.
- **Usa referencias**: Siempre consulta `03-references.md` para encontrar archivos.

