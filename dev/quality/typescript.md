# TypeScript — Estándares para este Proyecto

> Configuración `strict: true`. Sin `any`. Sin excepciones sin justificación.

---

## `tsconfig.json` requerido

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## Reglas de typing

### 1. Sin `any` explícito

```typescript
// ❌ Prohibido
const data: any = await fetch(url).then(r => r.json())
function process(input: any) { ... }

// ✅ Correcto
const data: unknown = await fetch(url).then(r => r.json())
// Luego narrows con un type guard o Zod parse
const parsed = mySchema.parse(data)
```

### 2. `unknown` en vez de `any` para datos externos

```typescript
// ❌
async function fetchExternal(): Promise<any> { ... }

// ✅
async function fetchExternal(): Promise<unknown> { ... }
// El caller usa Zod para validar el tipo
```

### 3. Tipos de dominio en `/src/lib/types/index.ts`

Todos los tipos de entidades del dominio viven en un solo archivo:

```typescript
// src/lib/types/index.ts

// Tipos primitivos del dominio
export type StoreStatus = 'demo' | 'active' | 'past_due' | 'suspended' | 'archived'
export type UserRole    = 'owner' | 'admin' | 'collaborator'
export type ActorType   = 'user' | 'superadmin' | 'system' | 'ai'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'

export type ErrorCode =
  | 'LIMIT_EXCEEDED'
  | 'MODULE_INACTIVE'
  | 'STORE_INACTIVE'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'CONFLICT'
  | 'SYSTEM_ERROR'

// Resultado estándar del executor
export type ActionResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: { code: ErrorCode; message: string; field?: string } }

// Contexto de tienda (construido por el middleware/servidor)
export type StoreContext = {
  store_id:       string
  slug:           string
  billing_status: StoreStatus
  status:         StoreStatus      // alias de billing_status
  modules:        Partial<Record<ModuleName, boolean>>
  limits:         { max_products: number; max_orders: number; ai_tokens: number }
  plan_id:        string | null
  ai_tokens_used: number
}

export type ModuleName =
  | 'catalog' | 'products' | 'categories' | 'cart' | 'orders'
  | 'stock' | 'payments' | 'variants' | 'wholesale' | 'shipping'
  | 'finance' | 'banners' | 'social' | 'product_page' | 'multiuser'
  | 'custom_domain' | 'tasks' | 'savings_account' | 'expenses' | 'assistant'
```

### 4. Tipos de componentes React

```typescript
// ✅ Tipar las props explícitamente
type Props = {
  title:       string
  description?: string
  onClose:     () => void
  children:    React.ReactNode
}

// ✅ Usar React.FC solo si se necesita el tipo de children implícito
// Preferir tipar props directamente (más explícito)
export function MyComponent({ title, onClose }: Props) { ... }
```

### 5. Casts de Supabase

El cliente de Supabase genera tipos automáticamente si se usan los tipos generados. Hasta que se implementen:

```typescript
// Patrón para casts seguros de Supabase
const { data } = await db
  .from('products')
  .select('id, name, price, is_active')
  .eq('store_id', storeId)

// Cast seguro cuando el tipo no está disponible
type ProductRow = {
  id:        string
  name:      string
  price:     number
  is_active: boolean
}
const products = (data ?? []) as ProductRow[]
```

### 6. Async/await con manejo de errores

```typescript
// ❌ Retornar promise sin manejo
async function risky() {
  return db.from('products').insert(data)  // si falla, propaga error sin contexto
}

// ✅ Manejar el error y retornar ActionResult
async function safe(): Promise<ActionResult<Product>> {
  const { data, error } = await db.from('products').insert(data).select().single()
  if (error) {
    console.error('[products] Error al crear:', error)
    return { success: false, error: { code: 'SYSTEM_ERROR', message: 'Error al crear el producto.' } }
  }
  return { success: true, data: data as Product }
}
```

### 7. Narrowing de `ActionResult`

```typescript
const result = await executor({ name: 'create_product', ... })

// ❌
if (result.data) { ... }  // no funciona: ActionResult puede ser { success: false }

// ✅
if (result.success) {
  console.log(result.data)  // TypeScript sabe que data existe aquí
} else {
  console.error(result.error.message)  // TypeScript sabe que error existe aquí
}
```

---

## Configuración ESLint

```json
// .eslintrc.json o en eslint.config.js (flat config de Next.js 15)
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["error", "warn"] }]
  }
}
```

---

## Checklist TypeScript

- [ ] `tsconfig.json` tiene `"strict": true`
- [ ] 0 errores en `npx tsc --noEmit`
- [ ] Sin `any` explícito en el código fuente
- [ ] Tipos de dominio centralizados en `src/lib/types/index.ts`
- [ ] `ActionResult<T>` usado como retorno de Server Actions y handlers
- [ ] Variables de props de componentes tipadas (no `props: any`)
- [ ] Casts de Supabase usando tipos explícitos (no `as any`)
