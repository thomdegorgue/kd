# ESTADO — KitDigital.AR · Estado de Implementación

> Este archivo es la memoria del proyecto entre sesiones.
> **Actualizarlo al final de cada sesión de trabajo.** Es el único archivo que se edita con frecuencia.

---

## Estado actual

```
Fase:    0 — Fundación Técnica
Paso:    0.0 — INICIO (nada implementado aún)
Estado:  ⬜ Sin comenzar
```

---

## Progreso por fase

| Fase | Estado | Completado | Pendiente |
|------|--------|-----------|-----------|
| **F0** — Fundación | ⬜ Sin comenzar | — | Todos los pasos |
| **F1** — Producto base | 🔒 Bloqueado | — | Requiere F0 |
| **F2** — Gestión contenido | 🔒 Bloqueado | — | Requiere F1 |
| **F3** — Billing | 🔒 Bloqueado | — | Requiere F2 |
| **F4** — Módulos base | 🔒 Bloqueado | — | Requiere F3 |
| **F5** — Performance | 🔒 Bloqueado | — | Requiere F4 |
| **F6** — IA Asistente | 🔒 Bloqueado | — | Requiere F5 |

---

## Detalle Fase 0

| Paso | Estado | Criterio de aceptación |
|------|--------|----------------------|
| 0.1 — Verificar schema.md | ⬜ | SQL listo para ejecutar |
| 0.2 — Inicializar Next.js | ⬜ | `npm run dev` sin errores |
| 0.3 — Tailwind tokens | ⬜ | Colores brand-500 funcionan |
| 0.4 — Estructura de carpetas | ⬜ | Estructura existe, build pasa |
| 0.5 — Clientes Supabase | ⬜ | 3 clientes compilan sin errores |
| 0.6 — Base de datos SQL | ⬜ | 28 tablas en Supabase, RLS activo |
| 0.7 — Tipos TypeScript | ⬜ | Tipos compilan, sin `any` explícito |
| 0.8 — Executor central | ⬜ | Executor importable, registry vacío |
| 0.9 — Middleware Next.js | ⬜ | `/admin` sin sesión → `/login` |
| 0.10 — Componentes base | ⬜ | 8 componentes renderizan en `/admin` |
| 0.11 — TanStack Query | ⬜ | Devtools visibles en dev |

---

## Bloqueantes activos

```
Ninguno
```

---

## Variables de entorno — Estado

| Variable | Estado |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ⬜ Pendiente |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⬜ Pendiente |
| `SUPABASE_SERVICE_ROLE_KEY` | ⬜ Pendiente |
| `MP_ACCESS_TOKEN` | ⬜ Pendiente |
| `MP_PUBLIC_KEY` | ⬜ Pendiente |
| `MP_WEBHOOK_SECRET` | ⬜ Pendiente |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ⬜ Pendiente |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | ⬜ Pendiente |
| `CLOUDINARY_API_KEY` | ⬜ Pendiente |
| `CLOUDINARY_API_SECRET` | ⬜ Pendiente |
| `UPSTASH_REDIS_REST_URL` | ⬜ Pendiente |
| `UPSTASH_REDIS_REST_TOKEN` | ⬜ Pendiente |
| `OPENAI_API_KEY` | ⬜ Pendiente |

→ Guía de obtención: [`PASOS-MANUALES.md`](/PASOS-MANUALES.md) — Bloque 0

---

## Log de sesiones

| Fecha | Sesión | Completado | Notas |
|-------|--------|-----------|-------|
| — | — | Proyecto inicializado | `/dev/` creado, listo para arrancar |

---

## Cómo actualizar este archivo

Al final de cada sesión de trabajo:

```
1. Marcar pasos completados con ✅
2. Actualizar "Estado actual" (Fase + Paso)
3. Actualizar tabla de detalle de la fase activa
4. Documentar bloqueantes si los hay
5. Agregar fila al Log de sesiones
```

Leyendas: `⬜` Sin comenzar · `🔄` En progreso · `✅` Completado · `❌` Bloqueado · `🔒` Fase bloqueada
