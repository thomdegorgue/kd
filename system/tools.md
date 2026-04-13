# Herramientas y Componentes Reutilizables

Cada herramienta se implementa como componente o utilidad independiente, reutilizable en cualquier módulo.

---

## DataTable

Tabla administrativa con funcionalidad completa.

**Props:**
- `columns` — definición de columnas (nombre, accessor, sortable, formato)
- `data` — array de datos
- `pagination` — server-side: `{ page, pageSize, total }`
- `onSort` — callback de ordenamiento server-side
- `filters` — configuración de filtros por columna
- `onExport` — callback para exportar (conecta con CSVExporter)
- `isLoading` — muestra skeleton
- `emptyState` — componente a mostrar cuando no hay datos

**Usado en:** productos, pedidos, clientes, finanzas, stock, tareas, pagos, expenses, savings.

**Incluye:** skeleton loading por defecto, empty state configurable, export CSV integrado con botón.

---

## PDFGenerator

Genera PDFs server-side con diseño profesional.

**Arquitectura:**
- API Route: `POST /api/pdf/[template]`
- Templates disponibles: `order`, `invoice`, `stock-report`, `finance-summary`
- Input: `{ template, data, store_config }`
- Output: PDF binario como respuesta

**Cada template incluye:**
- Logo de la tienda (desde `store.logo_url`)
- Nombre de la tienda y datos de contacto
- Tabla principal con los datos formateados
- Precios en formato ARS (`$X.XXX,XX`)
- Fecha de generación
- Footer con info legal mínima

**Componente UI:** `<PDFDownloadButton template="order" data={orderData} />`

**Usado en:** detalle de pedido (comprobante), resumen de finanzas, reporte de stock, listado de productos.

---

## CSVImporter

Importación de datos desde archivo CSV.

**Flujo:**
1. Upload del archivo (drag & drop o selección)
2. Parseo automático (detección de separador, encoding)
3. Mapeo de columnas (preview de primeras 5 filas)
4. Validación con Zod fila por fila
5. Preview de resultados: filas válidas (verde) y filas con errores (rojo + motivo)
6. Botón "Confirmar importación" ejecuta bulk insert vía executor
7. Resumen final: N importados, M errores

**Props:**
- `entity` — tipo de entidad (`products`, `customers`, `wholesale_prices`)
- `schema` — Zod schema para validación de cada fila
- `onSuccess` — callback al completar
- `onError` — callback si falla

**Usado en:** importar productos en bulk, subir lista de clientes, precios mayoristas.

---

## CSVExporter

Exportación de datos a CSV.

**Props:**
- `data` — array de objetos
- `columns` — cuáles columnas incluir y en qué orden
- `filename` — nombre del archivo de descarga
- `formatters` — funciones de formato por columna (ej: centavos → ARS)

**Funcionalidad:** genera blob CSV con encoding UTF-8 BOM (para compatibilidad con Excel en español), headers limpios, y descarga automática.

**Usado en:** pedidos, productos, clientes, finanzas, stock. Integrado en DataTable como botón de export.

---

## ImageUploader

Wrapper de Cloudinary para upload de imágenes.

**Props:**
- `onUpload(urls: string[])` — callback con URLs subidas
- `maxFiles` — máximo de archivos (validado antes de subir)
- `folder` — subcarpeta en Cloudinary (`products`, `banners`, `store`)
- `accept` — tipos MIME permitidos (default: `image/*`)
- `maxSizeMB` — tamaño máximo por archivo (default: 5MB)
- `storeId` — para armar el path `kitdigital/{storeId}/{folder}/`

**Incluye:** zona de drag & drop, preview de imagen seleccionada, barra de progreso, error state, botón de eliminar imagen.

**Usado en:** productos (hasta N imágenes según plan), banners, logo de tienda, avatar, comprobantes de gasto.

---

## WhatsAppMessageBuilder

Genera el mensaje formateado para WhatsApp.

**Input:**
- `items` — array de `{ name, quantity, unit_price, variant_label? }`
- `storeConfig` — `{ name, whatsapp, currency }`
- `shippingMethod?` — `{ name, price }`
- `customerName?`
- `customerNotes?`
- `trackingUrl?` — URL de seguimiento de envío (si existe un shipment con tracking_code)

**Output:**
- `messageText` — texto plano formateado con emojis y precios
- `whatsappUrl` — URL `https://wa.me/{phone}?text={encoded_message}`

**Formato del mensaje:**
```
🛒 *Pedido desde {storeName}*

📦 Productos:
• 2x Remera básica — $3.000
• 1x Jean slim — $8.500

🚚 Envío: Envío a domicilio — $500

💰 *Total: $12.000*

👤 Nombre: Juan
📝 Nota: Talle M en la remera

📦 Seguimiento: https://kitdigital.ar/tracking/{code}

_Enviado desde KitDigital.ar_
```

La línea de seguimiento solo se incluye si `trackingUrl` está presente.

**Lógica 100% client-side.** No toca backend. Usa datos del store de Zustand (carrito).

**Usado en:** CartDrawer → WhatsAppCheckoutButton. También reutilizable desde el panel admin al notificar envío al cliente.

---

## CurrencyFormatter

Formatea centavos a moneda legible.

**Funciones:**
- `formatPrice(cents: number, currency?: string): string` — ej: `150000` → `"$1.500,00"`
- `formatPriceShort(cents: number): string` — ej: `150000` → `"$1.500"`

**Hook:** `useCurrency()` — retorna `{ formatPrice, formatPriceShort, currency }` desde store config.

**Locale:** `es-AR`. Separador de miles: `.`. Separador decimal: `,`.

---

## DateFormatter

Formatea fechas para la UI.

**Funciones:**
- `formatDate(date: string | Date): string` — ej: `"12 abr 2026"`
- `formatDateTime(date: string | Date): string` — ej: `"12 abr 2026, 14:30"`
- `formatRelative(date: string | Date): string` — ej: `"hace 2 horas"`, `"ayer"`, `"hace 3 días"`

**Locale:** `es-AR`.

---

## ModalManager

Estado centralizado de modales.

**Store Zustand:**
```typescript
type ModalStore = {
  activeModal: string | null
  modalData: unknown
  open: (name: string, data?: unknown) => void
  close: () => void
}
```

**API de uso:**
```typescript
const { open } = useModalStore()
open('delete-product', { productId: '...' })
```

**Componente:** `<ModalContainer>` en el layout raíz que renderiza el modal activo según `activeModal`.

---

## ToastSystem

Notificaciones globales.

**Basado en:** sonner.

**Uso:**
```typescript
import { toast } from 'sonner'
toast.success('Producto creado')
toast.error('No se pudo guardar')
toast.loading('Guardando...')
```

**Integrado en:** todas las mutations de TanStack Query (onSuccess/onError).

---

## ModuleGate

Wrapper que bloquea UI si un módulo está inactivo.

**Props:**
- `module` — nombre del módulo (ModuleName)
- `fallback?` — componente alternativo (default: `<ModuleLockedState>`)

**Comportamiento:**
- Lee `store.modules` del StoreContext
- Si el módulo está activo → renderiza children
- Si está inactivo → renderiza fallback con nombre del módulo, descripción, y botón "Activar"

---

## PlanUpgradePrompt

Se muestra cuando se alcanza un límite.

**Props:**
- `limitType` — qué límite se alcanzó (`max_products`, `max_orders`, `ai_tokens`)
- `current` — valor actual
- `max` — valor máximo del plan
- `planTarget?` — plan al que debe subir

**Componente:** card con progreso visual, mensaje claro, y CTA "Mejorar plan" → navega a `/admin/billing`.
