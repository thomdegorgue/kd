# F4 — Módulos Base · Runbook

**Objetivo:** Orders y Stock disponibles como add-ons. Un negocio puede recibir, registrar y gestionar pedidos con descuento de stock coherente.

---

## Precondiciones

- [ ] Fase 3 completada
- [ ] Lifecycle de billing funciona (tiendas en `active`, `past_due`, etc.)

---

## Docs a leer

```
/system/modules/orders.md       ← lógica completa de pedidos
/system/modules/stock.md        ← control de stock y deducción
/system/modules/cart.md         ← conexión carrito → pedido
```

---

## PASO 4.1 — Módulo Orders

**Handlers:**
- `create_order` — registra pedido manualmente (desde WhatsApp recibido)
- `update_order_status` — transiciona estado del pedido
- `cancel_order` — cancela (estado terminal)
- `add_order_note` — agrega nota interna al pedido
- `list_orders` — listado con filtros
- `get_order` — detalle completo

**`create_order` — lógica de negocio:**
```typescript
// Input:
{
  customer_phone: string,
  customer_name?: string,
  items: Array<{ product_id: string; quantity: number; unit_price?: number }>,
  notes?: string,
  shipping_method_id?: string,
}

// El execute:
// 1. Buscar customer por phone en la tienda, o crear si no existe
// 2. Calcular total: suma de (unit_price ?? product.price) * quantity
// 3. INSERT en orders
// 4. INSERT en order_items (snapshot de precio: unit_price fijo en el momento de la orden)
// 5. Si módulo stock activo: llamar executor recursivo con 'process_stock_deduction'
// 6. Emitir 'order_created'
```

**Estados y transiciones:**
```
pending → confirmed → preparing → delivered
        ↘            ↘           ↘
          cancelled   cancelled   cancelled
```
Solo se puede cancelar desde `pending`, `confirmed` o `preparing`. No desde `delivered`.

**Panel `/admin/pedidos`:**
- Lista de pedidos con: número de pedido, cliente (nombre/teléfono), estado (badge), fecha, total
- Filtros: estado, fecha (hoy, esta semana, este mes)
- Card de pedido expandible con: ítems, stepper de estados, notas
- Botón "Contactar por WhatsApp" → `https://wa.me/{phone}?text=Hola {nombre}...`
- Stepper de estados: click en cada estado para avanzar → `update_order_status`

**Verificación:**
- Crear pedido → aparece en lista, en `orders` y `order_items` en Supabase
- Avanzar estado → badge cambia, registro en `events`
- Cancelar → estado terminal, no se puede volver a cambiar

---

## PASO 4.2 — Módulo Stock

**Handlers:**
- `update_stock` — ajuste manual de stock (ingreso/egreso con motivo)
- `get_stock_item` — stock actual de un producto
- `list_stock_items` — listado de todos los productos con stock
- `process_stock_deduction` — action interna (llamada por `create_order`)

**`process_stock_deduction` — lógica:**
```typescript
// Para cada item del pedido:
// 1. Leer stock actual: SELECT quantity FROM stock_items WHERE product_id = $id AND store_id = $store_id
// 2. Si quantity - deducted < 0 → retornar error CONFLICT "Stock insuficiente para {nombre}"
// 3. UPDATE stock_items SET quantity = quantity - $deducted
// 4. Si quantity resultante = 0 → emitir 'stock_depleted'

// Este handler tiene permissions: ['system'] — solo puede ser llamado por el executor internamente
```

**Panel `/admin/stock`:**
- Lista de todos los productos con columnas: imagen, nombre, stock actual (número)
- Indicador visual semántico:
  - Verde (`success-500`): stock > 5
  - Amarillo (`warning-500`): stock 1–5
  - Rojo (`error-500`): stock = 0
- Filtro "Sin stock" → muestra solo los agotados
- Botón "Ajustar" por producto → modal con: cantidad a ingresar/egresar y motivo

**Verificación:**
- Crear pedido con módulo stock activo → `stock_items.quantity` decrementado
- Crear pedido que agota el último ítem → evento `stock_depleted`
- Crear pedido con stock insuficiente → error `CONFLICT "Stock insuficiente"`
- Panel stock muestra indicadores correctos por cantidad

---

## Checklist de completitud de Fase 4

```
[ ] create_order handler registrado y funcional
[ ] Crear pedido busca/crea customer por teléfono
[ ] Snapshot de precios en order_items
[ ] update_order_status: transiciones válidas aplicadas
[ ] /admin/pedidos: lista, filtros, stepper de estados
[ ] Contactar por WhatsApp funciona desde el panel
[ ] process_stock_deduction: solo si módulo stock activo
[ ] Stock insuficiente → CONFLICT, no crea el pedido
[ ] /admin/stock: lista con indicadores semánticos
[ ] Ajuste manual de stock funciona
[ ] stock_depleted emitido cuando llega a 0
```

---

## Al finalizar

1. Actualizar `ESTADO.md`
2. Commit: `feat(fase-4): módulos orders y stock`
3. → Siguiente: [`/dev/fases/F5-performance.md`](/dev/fases/F5-performance.md)
