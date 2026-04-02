# Components — KitDigital.AR

## Propósito

Este archivo define el catálogo de componentes UI del sistema: primitivos reutilizables, patrones de página y componentes específicos de cada módulo declarados en sus respectivos archivos.

→ Sistema de diseño (tokens, colores, tipografía): `/system/design/system-design.md`
→ Reglas de frontend: `/system/frontend/frontend-rules.md`

---

## Niveles de Componentes

```
Nivel 1 — Primitivos        → /components/ui/
Nivel 2 — Componentes admin → /components/admin/
Nivel 3 — Componentes públicos → /components/public/
Nivel 4 — Páginas           → /app/(admin|public)/
```

Un componente de nivel superior puede usar componentes de nivel inferior.
Un primitivo **nunca** importa componentes de nivel 2 o 3.

---

## NIVEL 1 — Primitivos (`/components/ui/`)

Base: shadcn/ui. Se customiza el theme para que use los tokens de `system-design.md`.

### Inputs y Formularios

| Componente | Descripción | Props clave |
|-----------|-------------|-------------|
| `Input` | Campo de texto base | `type`, `label`, `error`, `hint` |
| `Textarea` | Campo de texto multilínea | `label`, `error`, `maxLength`, `showCount` |
| `Select` | Selector de opción única | `options`, `label`, `error`, `placeholder` |
| `MultiSelect` | Selector de múltiples opciones | `options`, `label`, `error` |
| `Checkbox` | Checkbox con label | `label`, `checked`, `onChange` |
| `Switch` | Toggle on/off | `label`, `checked`, `onChange` |
| `RadioGroup` | Grupo de opciones radio | `options`, `value`, `onChange` |
| `NumberInput` | Input numérico con validación | `min`, `max`, `step`, `label`, `error` |
| `PriceInput` | Input de precio en ARS (centavos internamente) | `value` (centavos), `onChange` |
| `DatePicker` | Selector de fecha | `value`, `onChange`, `minDate`, `maxDate` |
| `FileInput` | Upload de archivo con preview | `accept`, `maxSize`, `onUpload` |
| `ImageInput` | Upload de imagen con preview y Cloudinary | `value` (url), `onUpload`, `aspectRatio` |

### Botones y Acciones

| Componente | Descripción | Variantes |
|-----------|-------------|----------|
| `Button` | Botón estándar | `primary`, `secondary`, `ghost`, `destructive` |
| `IconButton` | Botón solo con ícono | `variant`, `size`, `aria-label` |
| `LoadingButton` | Button con estado loading integrado | extiende `Button` |
| `DropdownMenu` | Menú de acciones contextual | `trigger`, `items[]` |
| `ActionMenu` | Menú de 3 puntos (kebab) para filas de tabla | `items[]` |

### Feedback y Estado

| Componente | Descripción | Props clave |
|-----------|-------------|-------------|
| `Badge` | Etiqueta de estado | `variant`: `success`, `warning`, `error`, `info`, `gray` |
| `StatusBadge` | Badge mapeado a estados del dominio | `status`: estados de order, store, payment, etc. |
| `Toast` | Notificación temporal | `type`, `message`, `action?` |
| `Alert` | Mensaje de alerta inline | `type`, `title`, `message`, `action?` |
| `EmptyState` | Estado vacío de listas | `icon`, `title`, `description`, `action?` |
| `ErrorState` | Estado de error de página o sección | `title`, `description`, `retry?` |
| `Skeleton` | Placeholder de carga | `className` para dimensiones |

### Contenedores

| Componente | Descripción | Props clave |
|-----------|-------------|-------------|
| `Card` | Contenedor con bordes y sombra | `padding`, `header?`, `footer?` |
| `Modal` | Diálogo modal | `open`, `onClose`, `title`, `size` |
| `Drawer` | Panel lateral (mobile-friendly) | `open`, `onClose`, `title`, `side` |
| `ConfirmDialog` | Modal de confirmación destructiva | `title`, `description`, `onConfirm`, `onCancel` |
| `Sheet` | Drawer de bottom sheet en mobile | `open`, `onClose`, `title` |
| `Tabs` | Tabs de navegación horizontal | `tabs[]`, `activeTab`, `onChange` |
| `Accordion` | Secciones colapsables | `items[]` |
| `Tooltip` | Tooltip de texto | `content`, `children` |
| `Popover` | Popup contextual | `trigger`, `content` |

### Datos

| Componente | Descripción | Props clave |
|-----------|-------------|-------------|
| `Table` | Tabla de datos | `columns[]`, `data[]`, `loading`, `empty` |
| `DataTable` | Table con sorting, paginación y selección | extiende `Table` + `pagination`, `onSort` |
| `Pagination` | Paginación de listas | `page`, `total`, `pageSize`, `onChange` |
| `StatCard` | Card de métrica con número grande | `label`, `value`, `trend?`, `icon?` |
| `Avatar` | Avatar de usuario o tienda | `src?`, `name`, `size` |
| `ImagePreview` | Preview de imagen con fallback | `src`, `alt`, `aspectRatio` |

---

## NIVEL 2 — Componentes Admin (`/components/admin/`)

### Layout

| Componente | Descripción |
|-----------|-------------|
| `AdminLayout` | Layout raíz del panel: sidebar + contenido |
| `Sidebar` | Navegación lateral con módulos activos |
| `BottomNav` | Navegación inferior para mobile (máx. 5 ítems) |
| `PageHeader` | Cabecera de página: título + breadcrumb + acciones |
| `ModuleLockedState` | Estado de módulo inactivo con CTA de activación |

### Productos

| Componente | Módulo | Descripción |
|-----------|--------|-------------|
| `ProductCard` | products | Card de producto en grid del panel |
| `ProductForm` | products | Formulario de crear/editar producto |
| `ProductList` | products | Lista de productos con filtros y acciones |
| `ProductStatusToggle` | products | Toggle activo/inactivo con optimistic update |
| `ProductImageUpload` | products | Upload de imagen con preview (Cloudinary) |
| `CategorySelector` | categories | Selector de categorías para un producto |
| `CategoryList` | categories | Lista de categorías con drag & drop para orden |
| `CategoryForm` | categories | Formulario de crear/editar categoría |
| `VariantBuilder` | variants | Interfaz de construcción de variantes y opciones |
| `VariantTable` | variants | Tabla de combinaciones de variantes con precio/stock |
| `StockIndicator` | stock | Indicador de stock con color semántico |
| `StockAdjustForm` | stock | Formulario de ajuste de stock |
| `WholesaleRuleForm` | wholesale | Formulario de regla de precio mayorista |
| `WholesaleRuleList` | wholesale | Lista de reglas mayoristas de un producto |

### Pedidos

| Componente | Módulo | Descripción |
|-----------|--------|-------------|
| `OrderList` | orders | Lista de pedidos con filtros por estado/fecha |
| `OrderCard` | orders | Card de resumen de un pedido |
| `OrderDetail` | orders | Vista detallada de un pedido |
| `OrderStatusStepper` | orders | Stepper visual del estado del pedido |
| `OrderStatusSelect` | orders | Selector de estado del pedido |
| `OrderItemList` | orders | Lista de ítems de un pedido |
| `CustomerInfo` | orders | Card de información del cliente |
| `WhatsAppLink` | cart | Link de contacto directo al cliente por WhatsApp |
| `PaymentStatusBadge` | payments | Badge de estado del pago (integrado/manual) |

### Finanzas

| Componente | Módulo | Descripción |
|-----------|--------|-------------|
| `FinanceEntryForm` | finance | Formulario de ingreso/egreso de caja |
| `FinanceList` | finance | Lista de movimientos de caja |
| `FinanceSummaryCard` | finance | Resumen: total ingresos, egresos, saldo |
| `ExpenseForm` | expenses | Formulario de gasto |
| `ExpenseList` | expenses | Lista de gastos con filtros |
| `SavingsAccountCard` | savings_account | Balance + CTA de depósito/retiro |
| `SavingsMovementList` | savings_account | Historial de movimientos de la caja de ahorro |

### Contenido y Marketing

| Componente | Módulo | Descripción |
|-----------|--------|-------------|
| `BannerForm` | banners | Formulario de crear/editar banner |
| `BannerList` | banners | Lista de banners con toggle activo/inactivo |
| `BannerPreview` | banners | Preview del banner tal como se ve en la vitrina |
| `SocialLinkForm` | social | Formulario de link de red social |
| `SocialLinkList` | social | Lista de links con drag & drop para orden |

### Configuración y Cuenta

| Componente | Módulo | Descripción |
|-----------|--------|-------------|
| `StoreSettingsForm` | catalog | Formulario de configuración general de la tienda |
| `WhatsAppConfigForm` | catalog | Configuración del número y mensaje de WhatsApp |
| `ShippingMethodForm` | shipping | Formulario de método de envío |
| `ShippingMethodList` | shipping | Lista de métodos de envío |
| `UserList` | multiuser | Lista de usuarios con roles y acciones |
| `InviteUserForm` | multiuser | Formulario de invitación de usuario |
| `CustomDomainForm` | custom_domain | Formulario de configuración de dominio custom |
| `CustomDomainStatus` | custom_domain | Estado de verificación del dominio |
| `ModuleToggleCard` | catalog | Card de módulo con toggle activar/desactivar y precio |
| `PlanCard` | billing | Card de plan actual con uso y CTA de upgrade |

### Asistente IA

| Componente | Módulo | Descripción |
|-----------|--------|-------------|
| `AssistantChat` | assistant | Contenedor principal del chat del asistente |
| `ChatMessage` | assistant | Burbuja de mensaje (user / assistant) |
| `ActionProposal` | assistant | Card de propuesta de action con botón de confirmación |
| `ActionExecutedResult` | assistant | Resultado de action ejecutada (success / error) |
| `AssistantInput` | assistant | Input de mensaje con botón de envío |

### Tareas

| Componente | Módulo | Descripción |
|-----------|--------|-------------|
| `TaskList` | tasks | Lista de tareas pendientes/completadas |
| `TaskForm` | tasks | Formulario de crear tarea |
| `TaskItem` | tasks | Ítem de tarea con checkbox de completar |

---

## NIVEL 3 — Componentes Públicos (`/components/public/`)

Componentes de la vitrina pública (lo que ven los clientes de la tienda).

| Componente | Módulo | Descripción |
|-----------|--------|-------------|
| `PublicLayout` | catalog | Layout de la vitrina: header + footer |
| `StoreHeader` | catalog | Cabecera con nombre, logo y nav de categorías |
| `ProductGrid` | products | Grid de productos para el catálogo |
| `ProductCard` | products | Card de producto en la vitrina |
| `ProductDetailView` | product_page | Vista detallada del producto |
| `CategoryNav` | categories | Navegación horizontal por categorías |
| `CartDrawer` | cart | Drawer del carrito flotante |
| `CartItem` | cart | Ítem del carrito con cantidad y precio |
| `CartSummary` | cart | Resumen total del carrito |
| `WhatsAppCartButton` | cart | Botón flotante "Pedir por WhatsApp" |
| `BannerCarousel` | banners | Carousel de banners en el home |
| `SocialLinks` | social | Links a redes sociales en el footer |

---

## Patrón de Página del Panel (Master Page)

Toda página del panel de gestión sigue este patrón:

```
<AdminLayout>
  <PageHeader
    title="Nombre de la sección"
    breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Sección' }]}
    actions={<Button>Acción principal</Button>}
  />

  {/* Si el módulo está inactivo */}
  {!moduleActive && <ModuleLockedState module="nombre_modulo" />}

  {/* Si el módulo está activo */}
  {moduleActive && (
    <>
      {/* Filtros y búsqueda */}
      <FilterBar ... />

      {/* Lista o contenido principal */}
      {isLoading ? <SkeletonList /> : <DataTable ... />}

      {/* Estado vacío */}
      {!isLoading && data.length === 0 && (
        <EmptyState
          title="No hay [entidades] aún"
          description="Creá tu primer [entidad] para empezar."
          action={<Button>Crear [entidad]</Button>}
        />
      )}
    </>
  )}
</AdminLayout>
```

---

## Reglas de Componentes

1. **Un componente, una responsabilidad.** Si un componente hace demasiado, se divide.
2. **Sin lógica de negocio en componentes.** Los componentes presentan datos y disparan callbacks. No validan reglas de negocio.
3. **Sin fetch directo en componentes.** Todo data fetching está en hooks de TanStack Query.
4. **Props tipadas con TypeScript.** Todos los props tienen tipos explícitos. No se usa `any`.
5. **Accesibilidad por defecto.** Todos los componentes interactivos tienen aria labels cuando corresponde.
6. **Componentes de módulo no visibles si el módulo está inactivo.** El `ModuleLockedState` se renderiza en su lugar.
