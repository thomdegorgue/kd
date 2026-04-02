# Anti-Drift — Reglas para Agentes IA

> Estas reglas previenen los errores más comunes que cometen los agentes IA en este proyecto.
> Son adicionales a los anti-patterns de `/system/core/anti-patterns.md` (que son de diseño).
> Estas son **operativas**: errores de ejecución específicos de cómo trabaja una IA.

---

## AD-01 — No inventar nombres

**Prohibido:** crear variables, funciones, tipos, tablas o campos con nombres propios cuando el nombre ya está definido en `/system/core/domain-language.md`.

**Síntomas:** usar `shop` en vez de `store`, `item` en vez de `product`, `buyer` en vez de `customer`, `pedido` en vez de `order`, `StoreId` en vez de `store_id`.

**Correcto:** antes de nombrar cualquier cosa, consultar `domain-language.md`. Si no está, agregarlo ahí primero.

---

## AD-02 — No bypassear el executor

**Prohibido:** hacer `supabase.from('products').insert(...)` directamente en una Server Action, Route Handler o componente de React para operaciones de escritura de dominio.

**Síntomas:** imports de `createClient` directamente en archivos de página, inserts/updates sin pasar por `executor()`.

**Correcto:** toda escritura de dominio usa `executor({ name, store_id, actor, input })`. El executor centraliza validaciones, eventos y cache.

---

## AD-03 — No tomar store_id del cliente

**Prohibido:** leer `store_id` de `params`, `searchParams`, `body` del request, o cualquier input controlado por el cliente sin validación servidor.

**Síntomas:** `const storeId = params.storeId` en un Server Action que luego hace una query de escritura.

**Correcto:** el `store_id` se resuelve desde la sesión del usuario autenticado en el servidor: `store_users` donde `user_id = auth.uid()`.

---

## AD-04 — No avanzar con build roto

**Prohibido:** continuar implementando el siguiente archivo si el proyecto tiene errores de TypeScript o build.

**Síntomas:** "lo arreglo después", `// @ts-ignore`, `as any` para silenciar errores.

**Correcto:** cada archivo creado o modificado debe compilar antes de pasar al siguiente. `npm run build` o `npx tsc --noEmit` sin errores.

---

## AD-05 — No usar `any` explícito

**Prohibido:** `as any`, `: any`, `Record<string, any>` en código del proyecto.

**Excepción única:** cuando Supabase retorna un tipo que necesita cast explícito — usar `as unknown as TipoEspecífico`, no `as any`.

**Correcto:** usar los tipos de `/src/lib/types/index.ts`. Si falta un tipo, agregarlo ahí.

---

## AD-06 — No silenciar errores con try/catch vacíos

**Prohibido:** 
```typescript
try {
  await algo()
} catch {
  // ignorar
}
```

**Correcto:** los errores se capturan, se loggean con contexto (`console.error('[módulo] descripción:', error)`) y se retornan como `ActionResult` con `success: false`.

---

## AD-07 — No hardcodear textos de error del executor en el frontend

**Prohibido:** mostrar `error.code` ni mensajes internos como `"LIMIT_EXCEEDED"` directamente al usuario.

**Correcto:** mapear los `ErrorCode` a mensajes en español comprensibles. Ver `/dev/quality/errores.md`.

---

## AD-08 — No duplicar lógica de validación

**Prohibido:** validar lo mismo en el componente de React, en el Server Action, y en el executor.

**Correcto:** 
- Frontend: validación de UX (formularios con Zod/RHF — campos requeridos, formatos)
- Backend (executor): validación de negocio (límites, módulos, permisos, estado de tienda)
- No repetir la validación de negocio en el frontend

---

## AD-09 — No crear componentes que ya existen en shadcn/ui o en el design system

**Prohibido:** crear un `<Button>` propio, un `<Input>` propio, un `<Dialog>` propio.

**Correcto:** usar los componentes de `shadcn/ui` instalados en `/src/components/ui/`. Si no está instalado, instalarlo con `npx shadcn@latest add {componente}`.

---

## AD-10 — No mezclar Client Components y Server Components sin intención

**Prohibido:** agregar `'use client'` a un archivo solo porque "no sabe cómo hacerlo server-side".

**Regla:** 
- Por defecto, todos los componentes son Server Components
- `'use client'` solo cuando se necesita: estado local (`useState`, `useEffect`), event handlers, hooks de cliente (TanStack Query, Zustand)
- Los Server Components pueden importar Client Components, pero no al revés

---

## AD-11 — No omitir `store_id` en queries de dominio

**Prohibido:**
```typescript
const { data } = await db.from('products').select('*')
```

**Correcto:**
```typescript
const { data } = await db
  .from('products')
  .select('*')
  .eq('store_id', ctx.store_id)
```

---

## AD-12 — No avanzar de fase sin pasar el criterio de completitud

**Prohibido:** empezar Fase 1 si Fase 0 no cumple su criterio: `npm run dev` sin errores, Supabase conectado, 28 tablas, componentes base renderizan.

**Correcto:** verificar con el checklist de completitud de la fase antes de avanzar. Ver cada runbook en `/dev/fases/`.

---

## AD-13 — No crear tablas o campos no declarados en schema.md

**Prohibido:** agregar una columna a una tabla en Supabase porque "la necesito" sin que esté en `/system/database/schema.md`.

**Correcto:** si la columna hace falta, actualizar `schema.md` primero (con justificación), luego crear la migración.

---

## AD-14 — No usar precios en pesos en la base de datos

**Prohibido:** guardar `price: 1500` significando $1500 ARS.

**Correcto:** todos los precios se guardan **en centavos**: `price: 150000` = $1500. La conversión a pesos (`/ 100`) se hace solo en la capa de display de la UI.

---

## AD-15 — No confundir `billing_status` con `status` en stores

**Advertencia:** La tabla `stores` tiene `billing_status` como columna canónica del estado de facturación. Es el campo que usa el executor. No inventar un campo `status` separado ni usarlo de forma diferente.

**Correcto:** `store.billing_status` es la fuente de verdad. El `StoreContext.status` es un alias de `billing_status`.

---

## AD-16 — No crear Server Actions sin el executor para operaciones de dominio

**Prohibido:**
```typescript
'use server'
export async function createProduct(formData: FormData) {
  const db = await createClient()
  await db.from('products').insert({ ... })  // ← INCORRECTO
}
```

**Correcto:**
```typescript
'use server'
export async function createProduct(formData: FormData) {
  const user = await getUser()
  const storeId = await getStoreIdForUser(user.id)
  return executor({
    name: 'create_product',
    store_id: storeId,
    actor: { type: 'user', id: user.id },
    input: Object.fromEntries(formData),
  })
}
```

---

## AD-17 — No exponer SUPABASE_SERVICE_ROLE_KEY al cliente

**Prohibido:** `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` o usar el service role key en componentes client-side.

**Correcto:** el service role key solo se usa en Route Handlers y Edge Functions del servidor. Nunca en componentes React ni en archivos con `'use client'`.

---

## AD-18 — No ignorar el estado de tienda al ejecutar

**Prohibido:** ejecutar una action write en una tienda `suspended` o `archived`.

**Correcto:** el executor ya maneja esto (Paso 2 del pipeline), pero si se bypasea el executor en algún punto → verificar manualmente el `billing_status` antes de cualquier write.

---

## AD-19 — No usar `revalidatePath` sin ton ni son

**Prohibido:** `revalidatePath('/')` o `revalidatePath('/admin')` genérico después de cada mutación.

**Correcto:** usar `revalidatePath` con la ruta específica afectada. Para invalidación de cache de vitrina, el executor llama a `invalidateCache` con las keys específicas de Redis.

---

## AD-20 — No poner lógica en layouts

**Prohibido:** hacer queries de negocio dentro de `layout.tsx` (excepto la resolución de tienda para el layout de vitrina pública, que está documentada).

**Correcto:** los layouts solo proveen estructura de UI. Los datos de negocio se cargan en los `page.tsx` o en Server Components dentro de las páginas.

---

## AD-21 — No usar `fetch` directo para datos de Supabase desde el cliente

**Prohibido:** llamar a la API de Supabase con `fetch` manual desde componentes cliente.

**Correcto:** usar el cliente de Supabase browser (`createClient()` de `/src/lib/supabase/client.ts`) para queries de lectura client-side, o TanStack Query con Server Actions para mutaciones.

---

## AD-22 — No modificar archivos de /system durante la implementación

**Prohibido:** editar `/system/**/*.md` como parte de una tarea de implementación de código.

**Excepción:** si se detecta una inconsistencia real en `/system`, pausar, documentarla en `/system/core/decisions.md`, y notificar al usuario antes de continuar.

---

## AD-23 — No usar `console.log` para debugging en producción

**Prohibido:** dejar `console.log` en código que va a producción.

**Correcto:** usar `console.error` con prefijo de módulo para errores reales: `console.error('[executor] Error:', { action: params.name, error })`. Los logs informativos de desarrollo se eliminan antes de commit.

---

## AD-24 — No crear tipos duplicados

**Prohibido:** definir `type Store = { ... }` en un archivo de componente cuando ese tipo ya existe en `/src/lib/types/index.ts`.

**Correcto:** todos los tipos de dominio viven en `/src/lib/types/index.ts`. Los tipos de UI específicos de un componente van en el mismo archivo del componente.

---

## AD-25 — No asumir que el módulo está activo

**Prohibido:** implementar una feature de módulo sin verificar que el módulo está activo en el contexto de la tienda, confiando en que "el executor ya lo valida".

**Correcto:** el executor valida en backend. El frontend también debe verificar `storeContext.modules[moduleName]` para mostrar `ModuleLockedState` en vez de la UI del módulo. Doble verificación = doble seguridad.
