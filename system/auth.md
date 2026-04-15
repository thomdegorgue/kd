# Autenticación, Roles y Permisos

---

## Roles Globales (users.role)

| Rol | Descripción |
|-----|-------------|
| `user` | Usuario estándar. Acceso a tiendas donde tiene store_user. |
| `superadmin` | Operador global. Acceso a todo el sistema. No pertenece a ninguna tienda. |

---

## Roles por Tienda (store_users.role)

| Rol | Permisos |
|-----|----------|
| `owner` | Acceso total. Billing, configuración, módulos, usuarios, todo. |
| `admin` | Casi como owner. Sin billing ni transferencia de ownership. |
| `collaborator` | Operativo: ver/editar productos, ver/actualizar pedidos. Sin configuración, módulos ni billing. |

---

## Middleware Multitenant

El middleware de Next.js resuelve el contexto antes de cualquier handler:

1. **Rutas públicas** (`/(public)/[slug]/*`): resolver tienda por slug del subdominio o path. Sin autenticación.
2. **Rutas admin** (`/(admin)/admin/*`): requiere sesión. Resolver store_id del usuario. Si tiene múltiples tiendas, usar la activa en sesión.
3. **Rutas superadmin** (`/(superadmin)/superadmin/*`): requiere sesión con `role === 'superadmin'`.

El `StoreContext` se construye en servidor y se propaga:
```typescript
StoreContext = {
  store_id: UUID
  slug: string
  status: StoreStatus
  modules: Record<ModuleName, boolean>
  limits: { max_products: number; max_orders: number; ai_tokens: number }
}
```

---

## Resolución de Tienda

Orden de precedencia:
1. **Subdominio:** `{slug}.kitdigital.ar` → buscar store por slug
2. **Dominio custom:** leer Host header → buscar store por `custom_domain` (si módulo activo y dominio verificado)
3. **Sesión admin:** store_id del store_user del usuario autenticado

---

## Row Level Security (RLS)

Todas las tablas de dominio tienen RLS habilitado.

Política base: `store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())`

Catálogo público: políticas adicionales que permiten SELECT sin autenticación en productos, categorías y banners activos de tiendas con status `demo`, `active` o `past_due`.

Superadmin: bypasea RLS usando `service_role` key.

**Executor y eventos:** El executor SIEMPRE usa `supabaseServiceRole` para insertar en la tabla `events`. Esto es obligatorio porque `events.store_id` es nullable (eventos de sistema/superadmin global) y la política RLS de `events_insert` exige membresía en `store_users`. El service role bypasea esa restricción de forma segura.

RLS es la última línea de defensa. El backend también filtra por `store_id` en todas las queries.

---

## Aislamiento de Medios (Cloudinary)

```
kitdigital/{store_id}/products/{filename}
kitdigital/{store_id}/banners/{filename}
kitdigital/{store_id}/store/{filename}
```

El `store_id` en el path se verifica en backend antes del upload.

---

## Aislamiento de Cache (Redis)

```
store:{store_id}:products
store:{store_id}:categories
store:{store_id}:config
```

Solo se invalidan keys del `store_id` afectado.

---

## Invitaciones (módulo multiuser)

Las invitaciones se almacenan en la tabla `store_invitations` (separada de `store_users`).

1. Owner/admin invita por email con rol → se crea registro en `store_invitations` con token único
2. Se envía email vía Resend con link `{APP_URL}/invite/{token}`
3. Invitado abre el link → frontend verifica token contra `store_invitations`
4. Si el invitado ya tiene cuenta → `accept_invitation` crea `store_user` y marca `accepted_at`
5. Si no tiene cuenta → flujo de registro + aceptación combinado
6. Expiración: 72 horas (`expires_at`). Token expirado → `NOT_FOUND`
7. El `store_user` solo se crea al aceptar la invitación, nunca antes

**Nota:** el executor usa `supabaseServiceRole` para insertar y verificar invitaciones, ya que el invitado podría no tener aún un `store_user` en la tienda.

**`accept_invitation`:** debe ejecutarse solo en servidor (Server Action o API route) con **service role** o con una función SQL `SECURITY DEFINER` que valide el token, cree `store_user` y marque `accepted_at` en una transacción. El cliente nunca debe poder insertar en `store_users` ni leer tokens ajenos vía `anon`.
