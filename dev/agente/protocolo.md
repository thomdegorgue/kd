# Protocolo de Sesión — Agente IA

> Este protocolo se ejecuta al inicio y al cierre de cada sesión de trabajo.
> No es opcional. Garantiza consistencia entre sesiones.

---

## INICIO DE SESIÓN (primeros 3 minutos)

### Paso A — Orientarse

1. Leer `/dev/ESTADO.md` completo
   - ¿En qué fase/paso estás?
   - ¿Hay bloqueantes activos?
   - ¿Las variables de entorno necesarias para este paso están configuradas?

2. Verificar estado del proyecto (si ya existe código):
   ```bash
   npm run build
   ```
   Si hay errores de TypeScript o build → **resolverlos antes de continuar**. No avanzar sobre código roto.

3. Revisar los últimos cambios (si hay sesiones previas):
   ```bash
   git status
   git diff --stat
   ```

### Paso B — Cargar contexto del paso

1. Abrir el runbook de la fase activa en `/dev/fases/F{N}-*.md`
2. Ir a la sección del paso específico
3. Leer la lista "Docs a leer antes de este paso" — abrirlos todos
4. Identificar los archivos que se van a crear o modificar

### Paso C — Verificar precondiciones

Cada runbook de paso tiene una sección "Precondiciones". Verificar que todas se cumplen antes de empezar. Si alguna no se cumple → resolver la precondición primero.

---

## DURANTE LA SESIÓN

### Reglas de trabajo

**R1 — Un paso a la vez.**
Completar el paso activo antes de avanzar al siguiente. El criterio de aceptación del paso es la única señal de "done".

**R2 — Código compila antes de continuar.**
Después de cada archivo creado o modificado: `npm run build` o verificar que no hay errores de TypeScript en el editor. No acumular errores.

**R3 — Consultar `/system` antes de inventar.**
Si hay duda sobre comportamiento, naming, estructura de datos o flujo → consultar el doc de `/system` correspondiente. Nunca inventar una solución propia si el `/system` ya la define.

**R4 — Usar las plantillas.**
Toda pieza de código nueva que tiene una plantilla en `/dev/plantillas/` usa esa plantilla como base. No escribir desde cero lo que ya está templado.

**R5 — Registrar decisiones.**
Si durante la implementación surge una decisión arquitectónica no prevista → agregarla a `/system/core/decisions.md` antes de implementarla.

**R6 — No modificar `/system` ni `/docs`.**
Esos archivos son la fuente de verdad. Solo se modifican si hay una decisión explícita y documentada. En una sesión normal de implementación, no se tocan.

### Cómo manejar situaciones imprevistas

**Si algo del plan contradice algo de `/system`:**
→ `/system` tiene prioridad. Documentar la discrepancia en `/system/core/decisions.md` y seguir `/system`.

**Si una feature no está definida en `/system`:**
→ No implementar. Preguntar al usuario o agregar la definición a `/system` primero.

**Si TypeScript tira un error que no se puede resolver limpiamente:**
→ No usar `as` ni `any` para silenciarlo. Revisar los tipos en `/src/lib/types/index.ts` y ajustar correctamente.

**Si una query de Supabase devuelve error inesperado:**
→ Verificar RLS policies en Supabase Dashboard. Verificar que el `store_id` está correctamente propagado. Ver `/dev/infra/supabase.md`.

---

## CIERRE DE SESIÓN (últimos 3 minutos)

### Paso X — Verificar estado final

1. `npm run build` → debe pasar sin errores
2. `npx tsc --noEmit` → 0 errores TypeScript
3. Si hay cambios de DB en la sesión: verificar en Supabase Dashboard que las tablas/políticas existen

### Paso Y — Actualizar ESTADO.md

Abrir `/dev/ESTADO.md` y actualizar:

```
1. Marcar con ✅ los pasos completados en la sesión
2. Actualizar "Estado actual": Fase X, Paso Y.Z
3. Actualizar la tabla de detalle de la fase
4. Documentar cualquier bloqueante nuevo
5. Agregar fila al Log de sesiones con: fecha, qué se completó, notas
```

### Paso Z — Commit

```bash
git add -A
git commit -m "feat(fase-X): paso Y.Z — descripción breve de qué se implementó"
```

Formato de commit: `feat(fase-{N}): paso {N}.{M} — {descripción}`
Ejemplos:
- `feat(fase-0): paso 0.2 — next.js inicializado con dependencias`
- `feat(fase-1): paso 1.4 — handler create_product + panel /admin/products`

---

## Árbol de decisión: ¿qué hago cuando no sé qué hacer?

```
¿Está definido en /system/?
├── SÍ → seguir /system, implementar según spec
└── NO → ¿está en PLAN-DE-DESARROLLO.md?
          ├── SÍ → verificar que no contradice /system, implementar
          └── NO → no implementar solo. Preguntar al usuario.

¿El nombre que voy a usar está en domain-language.md?
├── SÍ → usar ese nombre exacto
└── NO → agregar a domain-language.md primero, luego usar

¿Existe un template en /dev/plantillas/ para lo que voy a crear?
├── SÍ → usar ese template, adaptar los campos específicos
└── NO → crear desde cero siguiendo los patrones del proyecto

¿El código compila?
├── SÍ → continuar
└── NO → resolver antes de seguir. Nunca avanzar sobre código roto.
```
