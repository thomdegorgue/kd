# Navegación — Mapa de Documentación

> Para cada tipo de tarea, qué docs de `/system` leer y en qué orden.
> No leer todo: leer lo específico del paso.

---

## Por tipo de tarea

### Crear un handler del executor

```
LEER (en orden):
1. /system/core/action-contract.md        ← forma del contrato
2. /system/backend/execution-model.md     ← pipeline completo
3. /system/modules/{modulo}.md            ← Actions + Data Impact del módulo
4. /system/core/events.md                 ← evento que emite (si aplica)
5. /system/core/domain-language.md        ← naming de la action y campos

TEMPLATE: /dev/plantillas/handler.md
```

---

### Crear una página del panel admin

```
LEER (en orden):
1. /system/frontend/frontend-rules.md     ← reglas de estructura y layout
2. /system/design/components.md           ← componentes disponibles
3. /system/modules/{modulo}.md            ← UI Components del módulo
4. /system/design/system-design.md        ← tokens de diseño

TEMPLATE: /dev/plantillas/pagina-admin.md
```

---

### Crear un componente admin

```
LEER (en orden):
1. /system/design/system-design.md        ← tokens: colores, tipografía, spacing
2. /system/design/components.md           ← si el componente ya existe o hay uno similar
3. /system/frontend/frontend-rules.md     ← Regla 1 (mobile-first), Regla 5 (optimistic)

TEMPLATE: /dev/plantillas/componente-admin.md
```

---

### Crear una página de vitrina pública

```
LEER (en orden):
1. /system/architecture/multi-tenant.md   ← resolución de tienda por subdominio
2. /system/modules/catalog.md             ← datos que expone la vitrina
3. /system/frontend/frontend-rules.md     ← Regla 1 (mobile-first), Regla 2 (superficies)
4. /system/design/system-design.md        ← diseño de la vitrina

TEMPLATE: /dev/plantillas/pagina-publica.md
```

---

### Implementar autenticación / flujo de onboarding

```
LEER (en orden):
1. /system/flows/onboarding.md            ← flujo completo paso a paso
2. /system/core/domain-language.md        ← estados de store (demo, active...)
3. /system/modules/catalog.md             ← action create_store
```

---

### Implementar billing / suscripción con Mercado Pago

```
LEER (en orden):
1. /system/billing/billing.md             ← modelo completo de billing
2. /system/flows/billing.md               ← flujo de suscripción
3. /system/billing/webhooks.md            ← pipeline del webhook (9 pasos)
4. /system/core/events.md                 ← eventos de billing
5. /dev/infra/servicios.md                ← sección Mercado Pago

TEMPLATE: /dev/plantillas/webhook-route.md
```

---

### Implementar cron job / lifecycle automático

```
LEER (en orden):
1. /system/flows/lifecycle.md             ← transiciones de estado de tienda
2. /system/backend/backend-rules.md       ← Regla 10 (cron jobs)
3. /dev/infra/supabase.md                 ← Edge Functions (Deno)

TEMPLATE: /dev/plantillas/edge-function.md
```

---

### Implementar el módulo de IA (asistente)

```
LEER (en orden):
1. /system/ai/ai-behavior.md              ← comportamiento y restricciones
2. /system/ai/actions.md                  ← lista completa de actions disponibles
3. /system/ai/execution.md                ← pipeline de ejecución de IA
4. /system/modules/assistant.md           ← módulo completo
5. /system/backend/execution-model.md     ← el executor que valida las actions de IA
```

---

### Escribir SQL (migración, tabla, índice, RLS)

```
LEER (en orden):
1. /system/database/schema.md             ← fuente de verdad de todas las tablas
2. /system/constraints/global-rules.md    ← R1 (store_id), R2 (query scoping)
3. /dev/infra/supabase.md                 ← cómo ejecutar en Supabase

TEMPLATE: /dev/plantillas/sql-migration.md
```

---

### Agregar cache con Redis

```
LEER (en orden):
1. /system/backend/backend-rules.md       ← Regla 9 (cache estratégico)
2. /dev/infra/servicios.md                ← sección Upstash Redis
```

---

### Implementar superadmin

```
LEER (en orden):
1. /system/superadmin/superadmin.md       ← capacidades y rutas
2. /system/frontend/frontend-rules.md     ← Regla 2 (superficie superadmin separada)
3. /system/backend/execution-model.md     ← actor: superadmin, bypasses permitidos
```

---

### Subir imágenes a Cloudinary

```
LEER:
1. /dev/infra/servicios.md                ← sección Cloudinary
2. /system/modules/{modulo}.md            ← campos image_url del módulo
```

---

## Índice rápido: qué archivo responde qué

| Pregunta | Archivo |
|----------|---------|
| ¿Cómo se llama esta entidad/action/evento? | `/system/core/domain-language.md` |
| ¿Qué hace el executor exactamente? | `/system/backend/execution-model.md` |
| ¿Qué reglas aplican a TODO el sistema? | `/system/constraints/global-rules.md` |
| ¿Qué está prohibido? | `/system/core/anti-patterns.md` |
| ¿Qué hace el módulo X? | `/system/modules/{X}.md` |
| ¿Cómo es el contrato de una action? | `/system/core/action-contract.md` |
| ¿Qué tablas existen en la DB? | `/system/database/schema.md` |
| ¿Qué eventos existen y qué payload tienen? | `/system/core/events.md` |
| ¿Cómo funciona el multi-tenant? | `/system/architecture/multi-tenant.md` |
| ¿Cómo funciona el billing? | `/system/billing/billing.md` |
| ¿Cómo funcionan los webhooks de MP? | `/system/billing/webhooks.md` |
| ¿Cuáles son las transiciones de lifecycle? | `/system/flows/lifecycle.md` |
| ¿Cómo es el onboarding? | `/system/flows/onboarding.md` |
| ¿Qué puede hacer el superadmin? | `/system/superadmin/superadmin.md` |
| ¿Qué reglas de frontend? | `/system/frontend/frontend-rules.md` |
| ¿Qué componentes de UI existen? | `/system/design/components.md` |
| ¿Cuáles son los tokens de diseño? | `/system/design/system-design.md` |
| ¿Cómo deploy en Vercel? | `/dev/infra/vercel.md` |
| ¿Cómo opero Supabase? | `/dev/infra/supabase.md` |
| ¿Cómo uso MP / Cloudinary / Redis? | `/dev/infra/servicios.md` |
| ¿Qué env vars necesito? | `/dev/infra/env-vars.md` |
| ¿Por qué se tomó esta decisión? | `/system/core/decisions.md` |
