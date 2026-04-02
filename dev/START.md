# START — KitDigital.AR · Centro de Operaciones

> **Todo agente IA que trabaje en este proyecto empieza aquí. Sin excepción.**

---

## Estado actual del proyecto

→ **Ver: [`/dev/ESTADO.md`](/dev/ESTADO.md)**

---

## ¿Qué vas a hacer en esta sesión?

### Continuar la implementación de una fase
→ Leer `ESTADO.md` → ir al runbook de la fase activa

| Fase | Runbook |
|------|---------|
| Fase 0 — Fundación | [`/dev/fases/F0-fundacion.md`](/dev/fases/F0-fundacion.md) |
| Fase 1 — Producto base | [`/dev/fases/F1-producto-base.md`](/dev/fases/F1-producto-base.md) |
| Fase 2 — Gestión de contenido | [`/dev/fases/F2-contenido.md`](/dev/fases/F2-contenido.md) |
| Fase 3 — Billing y lifecycle | [`/dev/fases/F3-billing.md`](/dev/fases/F3-billing.md) |
| Fase 4 — Módulos base | [`/dev/fases/F4-modulos.md`](/dev/fases/F4-modulos.md) |
| Fase 5 — Performance | [`/dev/fases/F5-performance.md`](/dev/fases/F5-performance.md) |
| Fase 6 — IA Asistente | [`/dev/fases/F6-ia.md`](/dev/fases/F6-ia.md) |

---

### Crear un artefacto de código específico

| Qué crear | Template |
|-----------|----------|
| Handler del executor | [`/dev/plantillas/handler.md`](/dev/plantillas/handler.md) |
| Server Action | [`/dev/plantillas/server-action.md`](/dev/plantillas/server-action.md) |
| Componente admin | [`/dev/plantillas/componente-admin.md`](/dev/plantillas/componente-admin.md) |
| Página del panel `/admin` | [`/dev/plantillas/pagina-admin.md`](/dev/plantillas/pagina-admin.md) |
| Página de vitrina pública | [`/dev/plantillas/pagina-publica.md`](/dev/plantillas/pagina-publica.md) |
| Hook TanStack Query | [`/dev/plantillas/query-hook.md`](/dev/plantillas/query-hook.md) |
| Migración SQL + RLS | [`/dev/plantillas/sql-migration.md`](/dev/plantillas/sql-migration.md) |
| Route handler (webhook) | [`/dev/plantillas/webhook-route.md`](/dev/plantillas/webhook-route.md) |
| Edge Function / Cron | [`/dev/plantillas/edge-function.md`](/dev/plantillas/edge-function.md) |

---

### Resolver una duda técnica o de arquitectura

| Pregunta | Dónde ir |
|----------|----------|
| ¿Cómo se llama esta entidad/acción/campo? | [`/system/core/domain-language.md`](/system/core/domain-language.md) |
| ¿Qué hace este módulo exactamente? | `/system/modules/{nombre}.md` |
| ¿Cómo funciona el executor? | [`/system/backend/execution-model.md`](/system/backend/execution-model.md) |
| ¿Cuáles son las reglas globales? | [`/system/constraints/global-rules.md`](/system/constraints/global-rules.md) |
| ¿Qué está prohibido? | [`/system/core/anti-patterns.md`](/system/core/anti-patterns.md) |
| ¿Cómo es el schema de la DB? | [`/system/database/schema.md`](/system/database/schema.md) |
| ¿Cómo manejo la infra de Vercel? | [`/dev/infra/vercel.md`](/dev/infra/vercel.md) |
| ¿Cómo opero Supabase? | [`/dev/infra/supabase.md`](/dev/infra/supabase.md) |
| ¿Cuáles son los servicios externos? | [`/dev/infra/servicios.md`](/dev/infra/servicios.md) |
| ¿Cuáles son las env vars? | [`/dev/infra/env-vars.md`](/dev/infra/env-vars.md) |
| ¿Algo está bien hecho? (verificación) | [`/dev/agente/verificacion.md`](/dev/agente/verificacion.md) |
| Tengo una decisión arquitectónica | [`/system/core/decisions.md`](/system/core/decisions.md) |

---

### Protocolo obligatorio al inicio de TODA sesión

**Antes de tocar cualquier archivo de código, hacer esto (toma 2 minutos):**

1. Leer `ESTADO.md` — saber en qué fase/paso estás y qué está pendiente
2. Verificar que el build no tiene errores: `npm run build` (si el proyecto ya existe)
3. Leer el runbook de la fase activa — sección del paso específico
4. Leer los docs de `/system` indicados en el runbook para ese paso
5. Seguir el protocolo completo en [`/dev/agente/protocolo.md`](/dev/agente/protocolo.md)

---

### Reglas de oro (siempre activas)

1. **`/system` manda.** Si hay duda de diseño o comportamiento, el `/system` es la fuente de verdad. No inventar.
2. **Toda escritura a la DB pasa por el executor.** Sin excepciones.
3. **`store_id` siempre del servidor.** Nunca del cliente.
4. **Precios en centavos en la DB.** Conversión solo en UI.
5. **Naming de `domain-language.md`.** Si el nombre no está ahí, agregarlo antes de usarlo.
6. **Módulos inactivos → `ModuleLockedState`.** No 404, no página vacía.
7. **No avanzar al siguiente paso hasta pasar el criterio de aceptación del actual.**

→ Las 25 reglas completas: [`/dev/agente/anti-drift.md`](/dev/agente/anti-drift.md)

---

## Jerarquía de fuentes de verdad

```
/docs/          ← negocio y producto (QUÉ construimos)
/system/        ← especificación técnica (CÓMO se comporta)
PLAN-DE-DESARROLLO.md  ← plan de ejecución (EN QUÉ ORDEN)
/dev/           ← fábrica operativa (CÓMO lo construye una IA)
```

**Conflicto entre capas:** `/system` > `PLAN-DE-DESARROLLO.md` > `/dev/`. Si hay contradicción, gana la capa superior y se registra en `/system/core/decisions.md`.
