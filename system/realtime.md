# Reactividad, Caché y Sincronización

Este archivo define cómo el sistema mantiene los datos frescos, cuándo usar SSR vs SPA, qué datos se cachean y por cuánto tiempo, y cómo se propagan los cambios entre secciones del panel.

---

## SPA vs SSR — Decisión por Área

| Área | Estrategia | Razón |
|------|-----------|-------|
| Catálogo público (home, producto, categorías) | SSR + ISR (60s) | SEO, velocidad de carga, Open Graph |
| Catálogo público (carrito) | Client Component (Zustand) | Estado local, sin SEO |
| Panel admin (layout, sidebar, nav) | Server Component | No cambia con datos |
| Panel admin (secciones de datos) | Client Components + TanStack Query | Interactividad, caché, refetch |
| Dashboard estadísticas | Client + polling cada 60s | Datos frescos sin realtime |
| Lista de pedidos | Client + Supabase Realtime | Actualizaciones push inmediatas |
| Configuración de tienda | Client | Formularios, sin SEO |
| Superadmin | Client + TanStack Query | Interno, sin SEO |

---

## Capas de Estado

| Capa | Tecnología | Qué contiene |
|------|-----------|-------------|
| Servidor | Supabase Postgres | Fuente de verdad absoluta |
| Caché servidor | Upstash Redis | Queries costosas, stats agregadas |
| Caché cliente | TanStack Query | Datos del servidor en el browser |
| Estado UI | Zustand | Carrito, modales, sidebar, notificaciones |
| Estado local | useState | Formularios, toggles efímeros |

---

## StaleTime por Entidad (TanStack Query)

Cuánto tiempo el dato en caché se considera "fresco" (no se refetcha):

| Query Key | staleTime | gcTime | Notas |
|-----------|-----------|--------|-------|
| `['dashboard-stats', storeId]` | 30s | 2min | También polling cada 60s |
| `['orders', storeId]` | 10s | 5min | + Realtime invalidation |
| `['orders', storeId, orderId]` | 15s | 5min | Detalle de pedido |
| `['products', storeId]` | 2min | 10min | Cambian menos frecuentemente |
| `['categories', storeId]` | 2min | 10min | |
| `['customers', storeId]` | 2min | 10min | |
| `['stock', storeId]` | 20s | 3min | Crítico post-venta |
| `['payments', storeId]` | 30s | 5min | |
| `['finance-entries', storeId]` | 1min | 5min | + invalidación tras pago/venta |
| `['expenses', storeId]` | 2min | 5min | |
| `['tasks', storeId]` | 1min | 5min | |
| `['store-config', storeId]` | 5min | 30min | Casi no cambia |
| `['store-modules', storeId]` | 10min | 60min | Solo cambia al upgradear |
| `['banners', storeId]` | 5min | 15min | |
| `['shipping-methods', storeId]` | 5min | 15min | |
| `['shipments', storeId]` | 30s | 5min | Crítico post-venta |
| `['savings', storeId]` | 2min | 10min | |
| `['plans']` | 30min | 60min | Casi nunca cambia |

---

## Invalidaciones en Cadena

Cuando ocurre un evento, qué queries se invalidan:

### Nueva orden registrada (`order_created`)
```
invalidar: ['orders', storeId]
invalidar: ['dashboard-stats', storeId]
invalidar: ['customers', storeId]  (si se creó customer nuevo)
si módulo stock activo:
  invalidar: ['stock', storeId]
```

### Pago registrado/aprobado (`payment_approved`)
```
invalidar: ['orders', storeId, orderId]
invalidar: ['payments', storeId]
invalidar: ['dashboard-stats', storeId]
si módulo finance activo:
  invalidar: ['finance-entries', storeId]
```

### Stock deducido (`stock_updated`)
```
invalidar: ['stock', storeId]
invalidar: ['products', storeId]  (disponibilidad en el catálogo)
```

### Producto creado/editado (`product_created`, `product_updated`)
```
invalidar: ['products', storeId]
invalidar: ['categories', storeId]  (conteo de productos por categoría)
revalidar catálogo: revalidatePath(`/${slug}`)
```

### Producto eliminado (`product_deleted`)
```
invalidar: ['products', storeId]
invalidar: ['categories', storeId]
invalidar: ['stock', storeId]  (si tenía stock)
revalidar catálogo: revalidatePath(`/${slug}`)
```

### Estado de tienda cambiado (`store_status_changed`)
```
invalidar: ['store-config', storeId]
invalidar: ['store-modules', storeId]
```

### Módulo activado/desactivado (`module_enabled`, `module_disabled`)
```
invalidar: ['store-config', storeId]
invalidar: ['store-modules', storeId]
```

### Categoría creada/editada/eliminada
```
invalidar: ['categories', storeId]
invalidar: ['products', storeId]  (por filtro de categoría)
revalidar catálogo: revalidatePath(`/${slug}`)
```

### Banner creado/editado/eliminado
```
invalidar: ['banners', storeId]
revalidar catálogo: revalidatePath(`/${slug}`)
```

### Finance entry o expense creado
```
invalidar: ['finance-entries', storeId]
invalidar: ['expenses', storeId]
invalidar: ['dashboard-stats', storeId]
```

### Envío creado/actualizado (`shipment_created`, `shipment_status_updated`)
```
invalidar: ['shipments', storeId]
invalidar: ['orders', storeId, orderId]  (estado de envío visible en detalle de pedido)
```

### Tarea completada/actualizada
```
invalidar: ['tasks', storeId]
```

### Savings movement creado
```
invalidar: ['savings', storeId]
invalidar: ['finance-entries', storeId]  (si vinculada)
```

---

## Supabase Realtime — Canales en Panel Admin

Realtime se activa solo dentro del AdminLayout. Se desactiva al salir.

| Canal | Tabla | Eventos | Handler |
|-------|-------|---------|---------|
| `orders-{storeId}` | `orders` | INSERT, UPDATE | Invalida `['orders']`, toast "Nueva orden" en INSERT |
| `payments-{storeId}` | `payments` | INSERT, UPDATE | Invalida `['payments']`, `['orders']` |
| `stock-{storeId}` | `stock_items` | UPDATE | Invalida `['stock']` |

Reglas:
- Los canales usan filtro `store_id=eq.{storeId}` para no recibir datos de otras tiendas.
- Cleanup: `unsubscribe()` en el `useEffect` cleanup del AdminLayout.
- Fallback: si Realtime falla, los staleTime de TanStack Query garantizan refresco periódico.

---

## Lógica de Tabs en Panel Admin

El panel admin tiene secciones organizadas en tabs o routes. Comportamiento:

| Acción | Comportamiento |
|--------|---------------|
| Tab no visitada aún | No se fetcha nada (lazy) |
| Tab visitada por primera vez | Fetch + caché en TanStack Query |
| Tab re-visitada | Sirve de caché inmediatamente + refetch en background si stale |
| Hover sobre tab (datos livianos) | Prefetch |
| Hover sobre tab (datos pesados: reportes) | No prefetch |
| Error en una sección | ErrorBoundary por sección; no rompe el resto |
| Loading de primera carga | Skeleton por sección |

---

## Optimistic Updates — Dónde Aplicar

| Acción | Optimistic | Razón |
|--------|-----------|-------|
| Cambio de estado de pedido | Sí | Rápido, reversible |
| Toggle módulo en config | Sí | Feedback instantáneo |
| Marcar tarea como completada | Sí | Acción frecuente |
| Actualizar precio de producto | Sí | Feedback rápido |
| Toggle activo/inactivo producto | Sí | Muy frecuente |
| Reorder (drag & drop) | Sí | Visual inmediato |
| Crear pedido | No | Depende de validaciones server |
| Crear/eliminar producto | No | Irreversible o complejo |
| Pagos / billing | No | Crítico, no arriesgar |
| Importación CSV | No | Resultado depende de validación |

---

## Panel de Ventas — Optimizaciones

El panel de creación de nueva orden debe ser especialmente rápido:

1. **Productos precargados:** al entrar al admin, se hace prefetch de `['products', storeId]`. La lista de productos ya está en caché cuando el dueño quiere crear un pedido.
2. **Clientes en caché local:** búsqueda client-side sobre el caché de `['customers', storeId]`.
3. **Formulario 100% client-side** con React Hook Form. Sin roundtrips hasta el submit.
4. **Submit → server action → al completar, invalidar `['orders', storeId]` → lista se refresca.** Sin optimistic update: la validación server (stock, límites, estado de tienda) es necesaria antes de mostrar el pedido como confirmado.
5. **Target: <300ms de feedback visual** via loading state explícito en el botón submit (spinner + disabled) mientras la server action procesa.

---

## Caché Redis (Upstash) — Qué Cachear Server-Side

| Key Pattern | Dato | TTL | Invalidación |
|------------|------|-----|-------------|
| `store:{storeId}:products:public` | Productos activos para el catálogo | 5min | `product_created`, `product_updated`, `product_deleted` |
| `store:{storeId}:categories:public` | Categorías activas para el catálogo | 5min | Cambio en categorías |
| `store:{storeId}:config` | Config pública de la tienda | 10min | `store_updated` |
| `store:{storeId}:stats:dashboard` | Stats del dashboard | 2min | Cualquier mutation relevante |
| `global:plans` | Lista de planes | 1h | Cambio en planes (superadmin) |

Keys siempre con prefijo `store:{storeId}:` para aislamiento multitenant.
Invalidación asíncrona (fire and forget) desde el executor paso 9.
