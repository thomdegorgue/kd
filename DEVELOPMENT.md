# Guía de Desarrollo - KitDigital.ar

Esta guía explica cómo desarrollar **KitDigital.ar** trabajando con IA (Claude/Cursor).

## 🎯 Filosofía

Este proyecto está optimizado para desarrollo con IA. La estructura `ai-instructions/` contiene todas las reglas, specs y referencias que la IA necesita para trabajar sin alucinar.

## 📂 Estructura de Documentación

### Para IA (automático)
- **`ai-instructions/`**: Carpeta que la IA lee PRIMERO
  - `00-skills.md`: Reglas globales (constitución de la IA)
  - `01-master-document.md`: Documento técnico completo
  - `02-schema.sql`: Esquema SQL completo
  - `03-references.md`: Mapa de referencias cruzadas
  - `04-implementation-order.md`: Orden de implementación estricto
  - `05-project-structure.md`: Estructura de carpetas oficial
  - `specs/`: Specs por módulo (templates base)

### Para Humanos
- **`docs/`**: Documentación legible para humanos
  - `Documento-Tecnico-Fundamental.md`: Versión legible del master document
  - `schema.sql`: Versión legible del schema

## 🚀 Flujo de Trabajo con IA

### 1. Antes de empezar

La IA debe leer automáticamente:
1. `.cursor/rules/ai-instructions.mdc` (si usas Cursor)
2. `ai-instructions/00-skills.md` (reglas globales)

### 2. Al implementar una feature

**Paso 1**: Consultar orden de implementación
```
Lee: ai-instructions/04-implementation-order.md
```
Esto te dirá en qué fase estás y qué sigue.

**Paso 2**: Leer spec correspondiente
```
Lee: ai-instructions/specs/spec-XX-*.md
```
Cada spec tiene:
- Referencias obligatorias al master document y schema
- Estructura de implementación
- Checklist de verificación

**Paso 3**: Consultar fuentes de verdad
- `ai-instructions/01-master-document.md`: Para contexto general
- `ai-instructions/02-schema.sql`: Para tablas y RLS
- `ai-instructions/05-project-structure.md`: Para rutas exactas

**Paso 4**: Implementar siguiendo el spec

**Paso 5**: Verificar checklist del spec

### 3. Al crear archivos nuevos

**Siempre consulta**: `ai-instructions/05-project-structure.md`

Este archivo tiene:
- Árbol completo de directorios
- Convenciones de nombres
- Rutas exactas que debes usar

**No inventes rutas ni nombres**. Si necesitas algo nuevo, primero actualiza `05-project-structure.md`.

## 📋 Checklist Antes de Crear Código

Antes de que la IA cree cualquier código, debe verificar:

- [ ] ¿Está definido en `01-master-document.md` o `02-schema.sql`?
- [ ] ¿Sigo el orden de `04-implementation-order.md`?
- [ ] ¿Uso la estructura de `05-project-structure.md`?
- [ ] ¿TypeScript estricto (sin `any`, sin `@ts-ignore`)?
- [ ] ¿Filtro por `tenant_id` en queries?
- [ ] ¿Mobile-first y responsive?
- [ ] ¿Nombres de archivos/rutas correctos?

Si alguna respuesta es "no", **detente y pregunta**.

## 🔍 Cómo Usar las Referencias

### Sintaxis de referencias

En los archivos de `ai-instructions/`, usa:
```
@/ai-instructions/01-master-document.md
@/ai-instructions/02-schema.sql
@/ai-instructions/specs/spec-XX-*.md
```

### En Cursor

Cursor automáticamente resuelve estas referencias usando la sintaxis `mdc:`:
```markdown
[archivo](mdc:ruta/al/archivo.md)
```

## 🎨 Convenciones de Código

### TypeScript
- `strict: true`
- Nunca `any` (usa `unknown` + refinamiento)
- Nunca `@ts-ignore` sin justificación
- Tipos en `types/` y `lib/supabase/types.ts`

### Componentes
- Server Components por defecto
- Client Components solo cuando sea necesario (`"use client"`)
- Mobile-first: 100% responsive
- shadcn/ui + Tailwind

### Multitenancy
- Siempre filtrar por `tenant_id` en queries
- Usar `current_tenant_id()` y `is_superadmin()` del schema
- RLS como primera línea de defensa

## 📝 Actualizar Documentación

### Cuando agregues una nueva feature

1. **Actualiza el spec** en `ai-instructions/specs/`
2. **Actualiza `CHANGELOG.md`** si es cambio significativo
3. **Actualiza `05-project-structure.md`** si agregas rutas/archivos

### Cuando cambies arquitectura

1. **Actualiza `01-master-document.md`**
2. **Actualiza `02-schema.sql`** si cambias DB
3. **Actualiza `CHANGELOG.md`** con tipo `ARCHITECTURE`
4. **Notifica en el spec correspondiente**

## 🐛 Debugging

### Si la IA "alucina"

1. Verifica que leyó `00-skills.md`
2. Verifica que consultó las fuentes de verdad
3. Pregunta explícitamente: "¿Esto está en el master document o schema?"

### Si hay inconsistencias

1. Verifica `03-references.md` para encontrar el archivo correcto
2. Verifica `CHANGELOG.md` para ver si hubo cambios recientes
3. Compara `docs/` vs `ai-instructions/` (deben estar sincronizados)

## 🚢 Deploy

Ver sección 8 del [Documento Técnico](./docs/Documento-Tecnico-Fundamental.md) para instrucciones completas.

### Checklist rápido:
- [ ] Ejecutar `schema.sql` en Supabase
- [ ] Configurar variables de entorno
- [ ] Configurar wildcard subdomains en Vercel
- [ ] Configurar Edge Functions
- [ ] Verificar que RLS esté habilitado

## 📚 Recursos Adicionales

- **Master Document**: [`ai-instructions/01-master-document.md`](./ai-instructions/01-master-document.md)
- **Schema SQL**: [`ai-instructions/02-schema.sql`](./ai-instructions/02-schema.sql)
- **Orden de implementación**: [`ai-instructions/04-implementation-order.md`](./ai-instructions/04-implementation-order.md)
- **Estructura de carpetas**: [`ai-instructions/05-project-structure.md`](./ai-instructions/05-project-structure.md)
- **Referencias cruzadas**: [`ai-instructions/03-references.md`](./ai-instructions/03-references.md)

## 💡 Tips

1. **Siempre pregunta si no estás seguro**: Es mejor preguntar que alucinar
2. **Sigue el orden**: No saltes fases en `04-implementation-order.md`
3. **Usa los nombres exactos**: Consulta `05-project-structure.md` siempre
4. **Testea cada fase**: Antes de avanzar, verifica que todo funcione
5. **Actualiza CHANGELOG**: Cuando hagas cambios significativos

---

**Última actualización**: Marzo 2026

