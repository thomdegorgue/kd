# Spec 06: Stock y Ventas

**Fase**: 4 (Módulos)  
**Prioridad**: MEDIA (módulos opcionales)  
**Dependencias**: `spec-03-modulos-potenciadores.md` (sistema de módulos debe estar completo)

## Referencias obligatorias

Antes de implementar, lee:
- `@/ai-instructions/01-master-document.md` (sección 5: Sistema de Módulos)
- `@/ai-instructions/02-schema.sql` (tablas: `stock_items`, `stock_movements`, `sales`)
- `@/ai-instructions/05-project-structure.md` (rutas: `app/(admin)/`)

## Objetivo

Implementar los módulos Stock y Ventas: gestión de inventario, movimientos de stock, y registro de ventas con sincronización automática.

## Contexto

Estos módulos son opcionales:
- **Stock**: Gestión de inventario (disponible, reservado, movimientos)
- **Ventas**: Registro de ventas (puede sincronizar con stock si está activo)
- **Activación**: Solo disponible si módulo está activo en `tenant_modules`

## Estructura de implementación

### 1. Módulo Stock

#### 1.1 Gestión de Stock

**Ubicación**: `app/(admin)/stock/page.tsx` (o ruta similar)

**Funcionalidades**:
- Lista de productos con stock
- Editar stock disponible
- Ver movimientos de stock
- Agregar movimiento manual (entrada, salida, ajuste)

**Tablas relacionadas**:
- `stock_items`: Stock actual por producto
- `stock_movements`: Historial de movimientos

#### 1.2 Sincronización con Productos

**Lógica**:
- Al crear producto, crear registro en `stock_items` (si módulo activo)
- Al vender (si módulo Ventas activo), descontar stock automáticamente
- Mostrar stock disponible en catálogo público (opcional)

#### 1.3 Movimientos de Stock

**Tipos**:
- `in`: Entrada de stock
- `out`: Salida de stock
- `adjust`: Ajuste manual

**Estructura (alto nivel)**:
```typescript
// Función para registrar movimiento
async function registerStockMovement(
  tenantId: string,
  productId: string,
  type: 'in' | 'out' | 'adjust',
  qty: number,
  reason?: string
) {
  // 1. Insertar en stock_movements
  // 2. Actualizar stock_items (available_qty)
}
```

### 2. Módulo Ventas

#### 2.1 Registro de Ventas

**Ubicación**: `app/(admin)/ventas/page.tsx` (o ruta similar)

**Funcionalidades**:
- Lista de ventas
- Crear venta manual
- Ver detalle de venta
- Filtrar por fecha, canal, etc.

**Tabla relacionada**:
- `sales`: Registro de ventas

#### 2.2 Sincronización con Pedidos

**Lógica**:
- Al confirmar pedido (WhatsApp), crear registro en `sales`
- Vincular con `orders` si existe
- Canal: `whatsapp`, `local`, `other`

#### 2.3 Sincronización con Stock

**Lógica** (si módulo Stock activo):
- Al crear venta, descontar stock automáticamente
- Registrar movimiento de stock tipo `out`
- Verificar que haya stock disponible antes de vender

**Estructura (alto nivel)**:
```typescript
// Función para crear venta
async function createSale(
  tenantId: string,
  orderId: string | null,
  channel: 'whatsapp' | 'local' | 'other',
  total: number,
  items: SaleItem[]
) {
  // 1. Verificar stock (si módulo Stock activo)
  // 2. Crear registro en sales
  // 3. Descontar stock (si módulo Stock activo)
  // 4. Registrar movimientos de stock
}
```

### 3. Verificación de Módulos

**Ubicación**: `lib/modules/moduleAccess.ts` (ya existe de Spec 03)

**Uso**:
```typescript
// Verificar si módulo está activo antes de mostrar UI
const { isModuleActive } = useModules();

if (!isModuleActive('stock')) {
  return <ModuleNotActive module="stock" />;
}
```

### 4. UI de Gestión

#### 4.1 Stock
- Lista de productos con stock
- Formulario para editar stock
- Formulario para agregar movimiento
- Historial de movimientos

#### 4.2 Ventas
- Lista de ventas
- Formulario para crear venta manual
- Detalle de venta
- Reportes básicos (opcional)

## Checklist de implementación

### Módulo Stock
- [ ] Verificar que módulo se puede activar/desactivar
- [ ] Crear UI de gestión de stock
- [ ] Implementar edición de stock disponible
- [ ] Implementar registro de movimientos
- [ ] Implementar sincronización con productos (crear stock_items al crear producto)
- [ ] Mostrar stock en catálogo público (opcional)

### Módulo Ventas
- [ ] Verificar que módulo se puede activar/desactivar
- [ ] Crear UI de gestión de ventas
- [ ] Implementar creación de venta manual
- [ ] Implementar sincronización con pedidos (WhatsApp)
- [ ] Implementar sincronización con stock (si módulo Stock activo)
- [ ] Crear reportes básicos (opcional)

### Integración
- [ ] Verificar que módulos se verifican correctamente
- [ ] Verificar que sincronización funciona
- [ ] Verificar que stock se descuenta al vender
- [ ] Verificar que movimientos se registran correctamente

### Testing
- [ ] Verificar que stock se gestiona correctamente
- [ ] Verificar que ventas se registran correctamente
- [ ] Verificar que sincronización funciona
- [ ] Verificar que módulos se activan/desactivan correctamente
- [ ] Verificar que UI es responsive

## Notas importantes

1. **Módulos opcionales**: Verificar siempre si módulo está activo antes de mostrar UI
2. **Sincronización**: Stock y Ventas pueden trabajar juntos o independientes
3. **Atomicidad**: Usar transacciones si es posible (crear venta + descontar stock)
4. **RLS**: Todas las queries deben respetar `tenant_id`
5. **Performance**: Considerar índices en `stock_items` y `sales` por `tenant_id`

## Próximos pasos

Una vez completado este spec:
- **Siguiente**: `spec-07-superadmin.md` (Fase 5) o módulos adicionales (Finanzas, Mayorista, Variantes)
- **Requisito**: Este spec debe estar 100% funcional antes de avanzar

