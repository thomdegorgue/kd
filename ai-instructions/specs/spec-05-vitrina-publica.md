# Spec 05: Vitrina Pública (Mi Vitrina)

**Fase**: 3 (Vitrina Pública)  
**Prioridad**: ALTA (producto core visible al público)  
**Dependencias**: `spec-01-multitenancy-middleware.md`, `spec-02-onboarding-ia.md` (deben estar completos)

## Referencias obligatorias

Antes de implementar, lee:
- `@/ai-instructions/01-master-document.md` (sección 6.2: Estructura Next.js, sección 7.2: Carrito → WhatsApp)
- `@/ai-instructions/02-schema.sql` (tablas: `products`, `categories`, `product_images`, `tenant_portada_principal`, `orders`, `order_items`)
- `@/ai-instructions/05-project-structure.md` (rutas: `app/(public)/[tenant]/`)

## Objetivo

Implementar la vitrina pública (Mi Vitrina): catálogo público por tenant accesible en `{slug}.kitdigital.ar`, con carrito que envía pedidos por WhatsApp.

## Contexto

La Vitrina Pública es el catálogo visible al público:
- **URL**: `{slug}.kitdigital.ar` o dominio custom
- **Público**: No requiere autenticación (usa anon key)
- **Mobile-first**: 99% de tráfico desde celular
- **Carrito**: Estado local + envío por WhatsApp

## Estructura de implementación

### 1. Layout Público

**Ubicación**: `app/(public)/[tenant]/layout.tsx`

**Responsabilidades**:
- Resolver tenant por slug (usar middleware)
- Obtener datos del tenant (nombre, color principal, portada)
- Aplicar estilos dinámicos (color principal)
- Renderizar header público

**Estructura (alto nivel)**:
```typescript
// app/(public)/[tenant]/layout.tsx
export default async function PublicLayout({ params, children }) {
  const tenant = await resolveTenantBySlug(params.tenant);
  if (!tenant) notFound();
  
  const portada = await getPortadaPrincipal(tenant.id);
  
  // Aplicar estilos dinámicos
  // Renderizar layout
}
```

### 2. Página Home (Catálogo)

**Ubicación**: `app/(public)/[tenant]/page.tsx`

**Contenido**:
- Portada Principal (título, subtítulo, fondo)
- Lista de categorías (opcional, si hay)
- Grid de productos (`ProductGrid`)
- Filtros por categoría (opcional)

**Estructura (alto nivel)**:
```typescript
// app/(public)/[tenant]/page.tsx
export default async function PublicHomePage({ params }) {
  const tenant = await resolveTenantBySlug(params.tenant);
  const products = await getActiveProducts(tenant.id);
  const categories = await getActiveCategories(tenant.id);
  
  // Renderizar catálogo
}
```

### 3. Componente ProductGrid

**Ubicación**: `app/(public)/[tenant]/_components/ProductGrid.tsx`

**Características**:
- Grid responsive (mobile-first)
- Loading skeleton
- Imágenes optimizadas (Next.js Image)
- Click para ver detalle

**Estructura (alto nivel)**:
```typescript
// app/(public)/[tenant]/_components/ProductGrid.tsx
export function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### 4. Página de Detalle de Producto

**Ubicación**: `app/(public)/[tenant]/producto/[productId]/page.tsx`

**Contenido**:
- Imágenes del producto
- Nombre, descripción, precio
- Botón "Agregar al carrito"
- Botón "Volver al catálogo"

### 5. Componente CartDrawer

**Ubicación**: `app/(public)/[tenant]/_components/CartDrawer.tsx`

**Características**:
- Drawer lateral (shadcn/ui)
- Estado local (localStorage o state)
- Lista de items (producto, cantidad, precio)
- Total calculado
- Botón "Enviar pedido por WhatsApp"

**Estructura (alto nivel)**:
```typescript
// app/(public)/[tenant]/_components/CartDrawer.tsx
export function CartDrawer() {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Agregar/quitar items
  // Calcular total
  // Botón WhatsApp
}
```

### 6. Componente WhatsAppCheckoutButton

**Ubicación**: `app/(public)/[tenant]/_components/WhatsAppCheckoutButton.tsx`

**Responsabilidades**:
- Construir mensaje de WhatsApp
- Formatear items del carrito
- Abrir `wa.me/{whatsapp}?text={mensaje}`
- Crear registro de pedido en DB (`orders` + `order_items`)

**Estructura (alto nivel)**:
```typescript
// app/(public)/[tenant]/_components/WhatsAppCheckoutButton.tsx
export function WhatsAppCheckoutButton({ items, tenant }) {
  const message = buildWhatsAppMessage(items, tenant);
  const url = `https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(message)}`;
  
  const handleClick = async () => {
    // Crear pedido en DB
    await createOrder(tenant.id, items, message);
    // Abrir WhatsApp
    window.open(url);
  };
}
```

### 7. Builder de Mensaje WhatsApp

**Ubicación**: `lib/whatsapp/buildMessage.ts`

**Formato del mensaje**:
```
¡Hola! Me interesa hacer un pedido:

• Producto 1 x2 - $5.000
• Producto 2 x1 - $3.000

Total: $8.000

Gracias!
```

**Estructura (alto nivel)**:
```typescript
// lib/whatsapp/buildMessage.ts
export function buildWhatsAppMessage(items: CartItem[], tenant: Tenant): string {
  // Construir mensaje formateado
}
```

### 8. Hook useCart

**Ubicación**: `hooks/useCart.ts`

**Funcionalidades**:
- Agregar producto al carrito
- Quitar producto del carrito
- Actualizar cantidad
- Obtener total
- Persistencia (localStorage opcional)

## Checklist de implementación

### Layout y routing
- [ ] Crear `app/(public)/[tenant]/layout.tsx`
- [ ] Resolver tenant por slug
- [ ] Obtener datos del tenant y portada
- [ ] Aplicar estilos dinámicos (color principal)
- [ ] Crear `app/(public)/[tenant]/page.tsx` (home)

### Componentes de catálogo
- [ ] Crear `ProductGrid` component
- [ ] Crear `CatalogHeader` component
- [ ] Implementar grid responsive
- [ ] Implementar loading skeletons
- [ ] Crear página de detalle de producto

### Carrito
- [ ] Crear `CartDrawer` component
- [ ] Crear `useCart` hook
- [ ] Implementar agregar/quitar items
- [ ] Implementar cálculo de total
- [ ] Persistencia en localStorage (opcional)

### WhatsApp
- [ ] Crear `WhatsAppCheckoutButton` component
- [ ] Crear `buildMessage` helper
- [ ] Implementar creación de pedido en DB
- [ ] Abrir WhatsApp con mensaje

### Persistencia de pedidos
- [ ] Crear función `createOrder()` (server action o API route)
- [ ] Insertar en tabla `orders`
- [ ] Insertar en tabla `order_items`
- [ ] Guardar snapshot del mensaje WhatsApp

### Testing
- [ ] Verificar que catálogo se muestra correctamente
- [ ] Verificar que carrito funciona
- [ ] Verificar que mensaje WhatsApp se construye correctamente
- [ ] Verificar que pedidos se guardan en DB
- [ ] Verificar que es responsive (mobile-first)

## Notas importantes

1. **Anon key**: Usar `anon key` para queries públicas (RLS permite SELECT público)
2. **Filtrado**: Siempre filtrar por `tenant_id` en queries (aunque RLS lo haga)
3. **Imágenes**: Usar Next.js Image con optimización
4. **Estado del carrito**: Local (no requiere backend hasta enviar)
5. **Pedidos**: Crear registro interno aunque el pedido se confirme por WhatsApp

## Próximos pasos

Una vez completado este spec:
- **Siguiente**: `spec-06-stock-y-ventas.md` (Fase 4) o `spec-07-superadmin.md` (Fase 5)
- **Requisito**: Este spec debe estar 100% funcional antes de avanzar

