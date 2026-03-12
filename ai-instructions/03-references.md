# Referencias cruzadas del proyecto

Este archivo es el **mapa de navegación** de todos los documentos del proyecto. Úsalo para encontrar rápidamente lo que necesitas.

## Documentos principales (fuentes de verdad)

### Master Document
- **Archivo**: `@/ai-instructions/01-master-document.md`
- **Contenido**: Visión, arquitectura, multitenancy, módulos, estructura Next.js, flujos, deploy
- **Cuándo leer**: Antes de implementar cualquier feature nueva

### Esquema SQL
- **Archivo**: `@/ai-instructions/02-schema.sql`
- **Contenido**: Tablas, RLS, funciones, triggers, índices completos
- **Cuándo leer**: Antes de hacer queries o crear nuevas tablas

### Orden de implementación
- **Archivo**: `@/ai-instructions/04-implementation-order.md`
- **Contenido**: Fases secuenciales estrictas (anti-alucinación)
- **Cuándo leer**: Antes de empezar cualquier implementación

### Estructura de carpetas
- **Archivo**: `@/ai-instructions/05-project-structure.md`
- **Contenido**: Árbol completo de directorios y archivos
- **Cuándo leer**: Antes de crear cualquier archivo nuevo

## Specs por módulo (leer en orden de implementación)

### 1. Multitenancy + Middleware
- **Archivo**: `@/ai-instructions/specs/spec-01-multitenancy-middleware.md`
- **Cuándo leer**: Fase 1 (Base)

### 2. Onboarding con IA
- **Archivo**: `@/ai-instructions/specs/spec-02-onboarding-ia.md`
- **Cuándo leer**: Fase 2 (Core)

### 3. Módulos Potenciadores + toggles
- **Archivo**: `@/ai-instructions/specs/spec-03-modulos-potenciadores.md`
- **Cuándo leer**: Fase 2 (Core)

### 4. Panel Admin
- **Archivo**: `@/ai-instructions/specs/spec-04-panel-admin.md`
- **Cuándo leer**: Fase 2 (Core)

### 5. Vitrina Pública
- **Archivo**: `@/ai-instructions/specs/spec-05-vitrina-publica.md`
- **Cuándo leer**: Fase 3 (Vitrina Pública)

### 6. Stock y Ventas
- **Archivo**: `@/ai-instructions/specs/spec-06-stock-y-ventas.md`
- **Cuándo leer**: Fase 4+ (Módulos)

### 7. Superadmin
- **Archivo**: `@/ai-instructions/specs/spec-07-superadmin.md`
- **Cuándo leer**: Fase 5+ (Superadmin)

## Documentación para humanos

### Documento Técnico (humano)
- **Archivo**: `docs/Documento-Tecnico-Fundamental.md`
- **Nota**: Versión legible para humanos. La IA debe usar `01-master-document.md`

### Schema SQL (humano)
- **Archivo**: `docs/schema.sql`
- **Nota**: Versión legible para humanos. La IA debe usar `02-schema.sql`

## Reglas y configuración

### Skills y reglas globales
- **Archivo**: `@/ai-instructions/00-skills.md`
- **Prioridad**: MÁXIMA (leer primero siempre)

### Changelog
- **Archivo**: `@/ai-instructions/CHANGELOG.md`
- **Uso**: Tracking de cambios en specs y decisiones importantes

## Cómo usar estas referencias

1. **Antes de implementar**: Lee `00-skills.md` → `04-implementation-order.md` → spec correspondiente
2. **Al crear queries**: Consulta `02-schema.sql` para tablas y RLS
3. **Al crear archivos**: Consulta `05-project-structure.md` para rutas exactas
4. **Al tener dudas**: Vuelve a `01-master-document.md` para contexto general

## Convención de referencias

Usa siempre la sintaxis `@/ai-instructions/...` para referencias internas. Esto asegura que la IA encuentre los archivos correctamente.

