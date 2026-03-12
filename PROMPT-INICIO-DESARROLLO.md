# 🚀 PROMPT PARA INICIAR DESARROLLO - KitDigital.ar

**Copia y pega este prompt completo al agente IA para comenzar el desarrollo.**

---

## PROMPT COMPLETO

```
Eres un Senior Full-Stack Engineer especializado en Next.js 15 + Supabase trabajando en KitDigital.ar, un SaaS multitenant modular para catálogos digitales + carrito WhatsApp.

OBJETIVO: Implementar FASE 1 completa del proyecto siguiendo estrictamente el orden de implementación.

INSTRUCCIONES CRÍTICAS:

1. LEE PRIMERO estos archivos (en este orden):
   - ai-instructions/00-skills.md (reglas globales - MÁXIMA PRIORIDAD)
   - ai-instructions/01-master-document.md (arquitectura y visión completa)
   - ai-instructions/02-schema.sql (esquema de base de datos)
   - ai-instructions/04-implementation-order.md (orden estricto - NO SALTES PASOS)
   - ai-instructions/05-project-structure.md (estructura exacta de carpetas)
   - ai-instructions/specs/spec-01-multitenancy-middleware.md (spec de Fase 1)

2. REGLAS ESTRICTAS:
   - NUNCA alucines ni inventes nada. Si algo no está en los archivos de arriba, PREGUNTA.
   - Sigue EXACTAMENTE la estructura de carpetas de 05-project-structure.md
   - TypeScript estricto: strict: true, nunca any, nunca @ts-ignore
   - Mobile-first: todos los componentes 100% responsive
   - Multitenancy: siempre filtra por tenant_id, usa current_tenant_id() y is_superadmin()

3. TAREA ACTUAL - FASE 1: Base (Configuración inicial)

   PASO 1.1: Configurar proyecto Next.js 15
   - Inicializar proyecto Next.js 15 con App Router
   - Configurar TypeScript estricto (tsconfig.json)
   - Instalar dependencias: Tailwind CSS, shadcn/ui, TanStack Query, @supabase/ssr, @supabase/supabase-js
   - Configurar Tailwind según shadcn/ui
   - Verificar que .env.example existe (si no, crearlo con variables del master document sección 8.1)

   PASO 1.2: Ya está hecho (ai-instructions/ creada)

   PASO 1.3: Middleware + resolución de tenant
   - Crear middleware.ts en root del proyecto
   - Implementar resolución de tenant por subdominio ({slug}.kitdigital.ar)
   - Implementar resolución de tenant por dominio custom
   - Setear contexto de tenant (headers/cookies) para SSR
   - Manejar rutas inválidas (404 si tenant no existe o inactivo)
   - Crear lib/tenant/resolveTenant.ts con funciones de resolución
   - Crear lib/tenant/tenantContext.ts con helpers de contexto
   - SIGUE EXACTAMENTE el spec: ai-instructions/specs/spec-01-multitenancy-middleware.md

   PASO 1.4: Tipos generados de Supabase
   - Instalar supabase CLI (si no está)
   - Crear lib/supabase/client.ts (browser client)
   - Crear lib/supabase/server.ts (server client)
   - Crear types/domain.ts con tipos básicos (Tenant, Product, etc.)
   - NOTA: Los tipos completos se generarán después cuando tengas el proyecto de Supabase

4. ESTRUCTURA DE ARCHIVOS (usa EXACTAMENTE estos nombres):
   - middleware.ts (root)
   - lib/tenant/resolveTenant.ts
   - lib/tenant/tenantContext.ts
   - lib/supabase/client.ts
   - lib/supabase/server.ts
   - types/domain.ts
   - app/layout.tsx (root layout básico)
   - app/globals.css

5. CHECKLIST ANTES DE CONTINUAR:
   - [ ] ¿Leí todos los archivos de referencia?
   - [ ] ¿Sigo el orden de 04-implementation-order.md?
   - [ ] ¿Uso la estructura exacta de 05-project-structure.md?
   - [ ] ¿TypeScript estricto (sin any, sin @ts-ignore)?
   - [ ] ¿Mobile-first y responsive?
   - [ ] ¿Nombres de archivos/rutas correctos?

6. CUANDO TERMINES FASE 1:
   - Verifica que TODO funcione
   - Testea el middleware con diferentes subdominios
   - Verifica que la resolución de tenant funciona
   - NO avances a Fase 2 hasta que Fase 1 esté 100% completa

IMPORTANTE: Si tienes dudas sobre algo, PREGUNTA antes de inventar. Los archivos en ai-instructions/ son la fuente de verdad absoluta.

Empieza ahora con PASO 1.1 (configurar proyecto Next.js 15).
```

---

## 📝 Notas para el Usuario

### Cuándo usar este prompt

1. **Primera vez**: Cuando empiezas el desarrollo desde cero
2. **Después de cada fase**: Modifica el prompt para indicar qué fase sigue
3. **Si la IA se desvía**: Copia el prompt de nuevo para resetear el contexto

### Cómo adaptar el prompt para otras fases

Para **FASE 2**, cambia la sección "TAREA ACTUAL" por:

```
3. TAREA ACTUAL - FASE 2: Core (Funcionalidad base)

   PASO 2.1: Onboarding con IA
   - [Seguir spec-02-onboarding-ia.md]
   
   PASO 2.2: Sistema de Módulos + toggles
   - [Seguir spec-03-modulos-potenciadores.md]
   
   PASO 2.3: Panel Admin básico
   - [Seguir spec-04-panel-admin.md]
```

### Variables a completar

Antes de enviar, el usuario debe tener:
- ✅ Proyecto de Supabase creado (para generar tipos)
- ✅ Credenciales de Supabase (URL, keys)
- ✅ OpenAI API key (para onboarding IA)
- ✅ Dominio configurado (kitdigital.ar)

---

## 🎯 Alternativa: Prompt más corto (si prefieres)

Si quieres algo más directo, usa este:

```
Implementa FASE 1 de KitDigital.ar siguiendo:
- ai-instructions/00-skills.md (reglas)
- ai-instructions/04-implementation-order.md (orden)
- ai-instructions/specs/spec-01-multitenancy-middleware.md (spec)

Empieza con: Configurar Next.js 15 + Middleware de multitenancy.

NO inventes nada. Si dudas, pregunta.
```

---

**Recomendación**: Usa el prompt completo la primera vez. Es más seguro y evita alucinaciones.

