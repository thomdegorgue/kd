# System Design — KitDigital.AR

## Propósito

Este archivo define el sistema de diseño visual de KitDigital: tokens de color, tipografía, espaciado, elevación, y principios de UI. Es la referencia para construir componentes consistentes en todas las superficies.

No define componentes específicos (eso está en `/system/design/components.md`).
No define reglas de arquitectura de frontend (eso está en `/system/frontend/frontend-rules.md`).

---

## Principios de Diseño

1. **Simple sobre complejo.** El dueño de tienda no es un diseñador. La UI debe ser obvia sin instrucciones.
2. **Rápido sobre bonito.** La performance percibida importa más que los efectos visuales.
3. **Consistente sobre creativo.** Los patrones repetitivos reducen la carga cognitiva.
4. **Mobile-first.** Todo elemento debe funcionar perfectamente en pantallas de 360px de ancho.
5. **Acciones claras.** Siempre debe ser obvio qué puede hacer el usuario en cada pantalla.

---

## Paleta de Colores

### Colores de Marca

| Token | Valor (hex) | Uso |
|-------|------------|-----|
| `brand-500` | `#6366F1` | Color primario (indigo) — botones, links, highlights |
| `brand-600` | `#4F46E5` | Hover de brand-500 |
| `brand-50`  | `#EEF2FF` | Fondos sutiles de marca |
| `brand-100` | `#E0E7FF` | Badges, chips de módulo activo |

### Escala de Grises (base UI)

| Token | Valor | Uso |
|-------|-------|-----|
| `gray-950` | `#0A0A0A` | Texto principal |
| `gray-700` | `#374151` | Texto secundario |
| `gray-500` | `#6B7280` | Texto terciario / placeholders |
| `gray-300` | `#D1D5DB` | Bordes |
| `gray-100` | `#F3F4F6` | Fondos de hover / filas alternas |
| `gray-50`  | `#F9FAFB` | Fondo de página |
| `white`    | `#FFFFFF` | Fondo de cards y paneles |

### Colores Semánticos

| Token | Valor | Uso |
|-------|-------|-----|
| `success-500` | `#22C55E` | Estados positivos (pagado, activo, entregado) |
| `success-50`  | `#F0FDF4` | Fondo de badge success |
| `warning-500` | `#F59E0B` | Alertas, estados intermedios (pendiente, por vencer) |
| `warning-50`  | `#FFFBEB` | Fondo de badge warning |
| `error-500`   | `#EF4444` | Errores, estados negativos (cancelado, fallido) |
| `error-50`    | `#FEF2F2` | Fondo de badge error |
| `info-500`    | `#3B82F6` | Información neutral |
| `info-50`     | `#EFF6FF` | Fondo de badge info |

### Dark Mode

El sistema **no implementa dark mode en Fase 0**. El panel de gestión es light-only.
La vitrina pública puede tener su propio tema definido por el dueño de tienda en fases futuras.

---

## Tipografía

**Fuente:** Inter (Google Fonts, cargada con `next/font`)

### Escala Tipográfica

| Token | Size | Weight | Line Height | Uso |
|-------|------|--------|-------------|-----|
| `text-xs`    | 12px | 400 | 1.5 | Labels, metadata |
| `text-sm`    | 14px | 400 | 1.5 | Texto de UI, descripciones |
| `text-base`  | 16px | 400 | 1.5 | Texto de contenido principal |
| `text-lg`    | 18px | 500 | 1.4 | Subtítulos de sección |
| `text-xl`    | 20px | 600 | 1.3 | Títulos de página |
| `text-2xl`   | 24px | 700 | 1.2 | Títulos principales |
| `text-3xl`   | 30px | 700 | 1.2 | Hero / landing |

**Reglas de uso:**
- Nunca más de 3 tamaños diferentes en una misma pantalla
- El texto de acciones (botones, links) siempre en `text-sm` o `text-base`
- Las cifras métricas (ventas del mes, cantidad de pedidos) en `text-2xl` o `text-3xl`

---

## Espaciado

Sistema basado en múltiplos de 4px (escala de Tailwind).

| Token | Valor | Uso típico |
|-------|-------|-----------|
| `space-1`  | 4px  | Gap mínimo entre elementos inline |
| `space-2`  | 8px  | Gap entre elementos relacionados |
| `space-3`  | 12px | Padding interno de chips/badges |
| `space-4`  | 16px | Padding estándar de componentes |
| `space-6`  | 24px | Separación entre secciones |
| `space-8`  | 32px | Separación entre bloques mayores |
| `space-12` | 48px | Margen de página en mobile |
| `space-16` | 64px | Margen de página en desktop |

---

## Elevación (Sombras)

| Token | Valor CSS | Uso |
|-------|-----------|-----|
| `shadow-none` | — | Elementos flat (sin elevación) |
| `shadow-sm`  | `0 1px 2px rgba(0,0,0,0.05)` | Cards en estado rest |
| `shadow-md`  | `0 4px 6px rgba(0,0,0,0.07)` | Cards en hover / dropdowns |
| `shadow-lg`  | `0 10px 15px rgba(0,0,0,0.1)` | Modales / drawers |

La elevación comunica jerarquía. Se usa con moderación: máx. 2 niveles de elevación visibles en una misma pantalla.

---

## Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-sm`  | 4px  | Inputs, badges pequeños |
| `rounded-md`  | 8px  | Botones, chips |
| `rounded-lg`  | 12px | Cards |
| `rounded-xl`  | 16px | Modales, drawers |
| `rounded-full`| 9999px | Avatares, toggles |

---

## Grillas y Layout

### Panel de Gestión (Admin)

```
Mobile (< 768px):
  - Navigation: bottom tab bar (5 ítems máximo)
  - Contenido: 1 columna, full width, padding 16px lateral
  - Sin sidebar

Tablet (768px - 1024px):
  - Navigation: sidebar colapsado (solo íconos, 60px)
  - Contenido: 1 columna con padding 24px lateral

Desktop (> 1024px):
  - Navigation: sidebar expandido (240px)
  - Contenido: max-width 1280px, centrado, padding 32px lateral
  - En secciones de lista + detalle: split view 60/40
```

### Vitrina Pública

```
Mobile (< 768px):
  - Grid de productos: 2 columnas
  - Padding lateral: 16px

Tablet (768px - 1024px):
  - Grid de productos: 3 columnas

Desktop (> 1024px):
  - Grid de productos: 4 columnas
  - Max-width: 1200px, centrado
```

---

## Estados Visuales de Componentes

Todo elemento interactivo tiene 5 estados definidos:

| Estado | Indicador visual |
|--------|-----------------|
| `default` | Estilo base |
| `hover` | Fondo ligeramente más oscuro / border brand |
| `focus` | Outline brand-500 de 2px (visible con teclado) |
| `active` / `pressed` | Escala ligera (scale-95) |
| `disabled` | Opacidad 50%, cursor not-allowed |
| `loading` | Spinner + disabled |
| `error` | Border error-500 + texto error debajo |
| `success` | Border success-500 (transitorio, 2 segundos) |

---

## Iconografía

**Librería:** Lucide React

Reglas:
- Tamaño estándar: 16px (inline en texto), 20px (botones), 24px (nav / actions principales)
- Color: hereda el color del texto padre (`currentColor`)
- Íconos solos (sin texto) siempre tienen `aria-label` o están acompañados de tooltip
- No se mezclan íconos de distintas librerías

---

## Animaciones y Transiciones

**Principio:** las transiciones existen para dar feedback, no para decorar.

| Elemento | Transición |
|----------|-----------|
| Hover de botón | `duration-150 ease-in-out` |
| Apertura de modal | `duration-200 ease-out` (fade + scale desde 95% a 100%) |
| Apertura de dropdown | `duration-100 ease-out` |
| Toast / notificación | Slide desde el borde + fade |
| Skeleton a contenido | `duration-300` fade |
| Page transition | Sin animación (instantáneo) |

No se usan animaciones que duren más de 300ms. No se usan animaciones en listas largas.

---

## Nomenclatura de Clases de Estado

Para componentes que tienen distintos estados visuales según datos del sistema, se usan estas clases semánticas consistentes:

| Estado de entidad | Clase / badge color |
|------------------|-------------------|
| `active` / `published` | `success` (verde) |
| `pending` | `warning` (amarillo) |
| `cancelled` / `failed` | `error` (rojo) |
| `inactive` / `hidden` | `gray` (gris) |
| `processing` | `info` (azul) |
| `demo` (tienda) | `info` (azul) |
| `past_due` | `warning` (amarillo) |
| `archived` | `gray` (gris) |

---

## Breakpoints

| Nombre | Ancho mínimo | Descripción |
|--------|-------------|-------------|
| `xs` (base) | 0px | Mobile pequeño (360px objetivo mínimo) |
| `sm` | 640px | Mobile grande |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop pequeño |
| `xl` | 1280px | Desktop estándar |
| `2xl` | 1536px | Desktop grande |

El objetivo de ancho mínimo de soporte es **360px** (Android económico).
No se optimiza para pantallas menores a 360px.
