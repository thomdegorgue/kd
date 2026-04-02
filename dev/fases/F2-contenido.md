# F2 — Gestión de Contenido · Runbook

**Objetivo:** el dueño administra su tienda de forma completa y autónoma.
**Criterio de completitud:** ciclo completo de creación/edición/publicación de productos sin fricción. Personalización visual de la tienda funciona.

---

## Precondiciones

- [ ] Fase 1 completada
- [ ] El dueño puede crear productos y ver la vitrina

---

## Docs a leer

```
/system/modules/catalog.md       ← actions update_store_config, update_store_whatsapp_config
/system/modules/banners.md       ← módulo banners
/system/modules/social.md        ← módulo social links
/system/design/components.md     ← componentes del panel admin
```

---

## PASO 2.1 — Mejoras al panel de gestión

**`/admin` (Dashboard):**
- `StatCard` con: productos activos, categorías, pedidos del mes (pedidos en 0 hasta Fase 4)
- Usar `Promise.all` para cargar las 3 stats en paralelo

**`/admin/products` (mejoras):**
- Búsqueda por nombre (input con debounce 300ms → filtra localmente el array cargado)
- Ordenamiento: `select` con opciones "Más recientes", "Nombre A-Z", "Precio menor", "Precio mayor"
- Paginación client-side de 20 ítems (sin backend adicional)

**`/admin/categories` (drag & drop):**
- Usar `@dnd-kit/sortable` para la lista draggable
- Al soltar → llamar a `reorder_categories` con el nuevo array de `{id, sort_order}`

---

## PASO 2.2 — Configuración de tienda

**Archivo:** `src/app/(admin)/admin/configuracion/page.tsx`

**Tabs usando el componente `Tabs` de shadcn/ui:**

**Tab "General":**
- Campos: nombre, descripción, rubro
- Logo (upload a Cloudinary, carpeta `stores/{store_id}/logo`)
- Cover principal (upload a Cloudinary, carpeta `stores/{store_id}/cover`)
- Handler: `update_store_config` → `UPDATE stores SET config = config || $1`

**Tab "WhatsApp":**
- Número de contacto (con validación de formato internacional)
- Mensaje template del pedido con preview en tiempo real
- Variables disponibles: `{items}`, `{total}`, `{store_name}`
- Handler: `update_store_whatsapp_config`

**Tab "Apariencia":**
- Color primario: `<input type="color">` con preview
- Color secundario: `<input type="color">` con preview
- Preview live: mini-mockup de la vitrina con los colores seleccionados
- Los colores se guardan en `stores.config.primary_color` y `stores.config.secondary_color`
- La vitrina los lee del config y los aplica vía CSS custom properties (ver template vitrina pública)

**Verificación:**
- Cambiar nombre → se refleja en la vitrina (puede tardar hasta 60s por ISR)
- Logo subido → visible en la vitrina
- Colores cambiados → vitrina los aplica correctamente

---

## PASO 2.3 — Módulo Banners

**Docs:** `/system/modules/banners.md`

**Handlers:** `create_banner`, `update_banner`, `delete_banner`, `toggle_banner_active`, `reorder_banners`.

**Panel `/admin/banners`:**
- Lista de banners con preview de imagen (miniaturas)
- Formulario: imagen (Cloudinary, carpeta `stores/{store_id}/banners`), título, subtítulo, link (opcional)
- Toggle activo/inactivo
- Drag & drop para reordenar

**En la vitrina pública:**
- `BannerCarousel` component: carrusel con auto-play, dots de navegación
- Solo muestra si `modules.banners === true` y hay banners activos
- Responsive: full-width en mobile, max-width en desktop

**Verificación:**
- Crear banner → aparece en la vitrina (si módulo activo)
- Desactivar banner → desaparece de la vitrina
- Reordenar → nuevo orden en la vitrina

---

## PASO 2.4 — Módulo Social Links

**Docs:** `/system/modules/social.md`

**Handlers:** `create_social_link`, `update_social_link`, `delete_social_link`, `reorder_social_links`.

**Tab "Redes Sociales" en `/admin/configuracion`:**
- Lista de links con ícono de la red
- Redes soportadas: Instagram, Facebook, TikTok, Twitter/X, YouTube, LinkedIn, WhatsApp
- Cada ítem: red (select), URL, orden (drag & drop)

**En la vitrina:** icons en el footer con `<a href={link.url} target="_blank">` y los íconos correspondientes de Lucide.

**Verificación:**
- Agregar Instagram → íconos en footer de la vitrina
- Reordenar → nuevo orden en footer

---

## Checklist de completitud de Fase 2

```
[ ] Dashboard muestra 3 StatCards con datos reales
[ ] /admin/products tiene búsqueda y ordenamiento
[ ] /admin/categories tiene drag & drop funcional
[ ] /admin/configuracion: tabs General, WhatsApp, Apariencia, Redes funcionan
[ ] Logo y cover suben a Cloudinary y se ven en la vitrina
[ ] Color primario/secundario se aplica en la vitrina
[ ] Banners: CRUD completo + toggle + reordenamiento
[ ] Banners visibles en la vitrina (si módulo activo)
[ ] Social links: CRUD + reordenamiento
[ ] Links en footer de la vitrina
```

---

## Al finalizar

1. Actualizar `ESTADO.md`
2. Commit: `feat(fase-2): gestión de contenido — config, banners, social`
3. → Siguiente: [`/dev/fases/F3-billing.md`](/dev/fases/F3-billing.md)
