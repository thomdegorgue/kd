# Servicios Externos — Guía de Integración

> Cómo usar cada servicio: SDK, patrones, gotchas.

---

## Mercado Pago

**SDK:** `mercadopago` (npm)
**Docs:** https://www.mercadopago.com.ar/developers/es/docs

### Instalar
```bash
npm install mercadopago@latest
```

### Cliente
```typescript
// src/lib/mercadopago/client.ts
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago'

export const mp          = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })
export const preApproval = new PreApproval(mp)
export const payment     = new Payment(mp)
```

### Crear suscripción
```typescript
import { preApproval } from '@/lib/mercadopago/client'

const subscription = await preApproval.create({
  body: {
    reason:             `KitDigital — Plan ${planName}`,
    external_reference: store_id,    // usar store_id como referencia
    payer_email:        user.email,
    auto_recurring: {
      frequency:          1,
      frequency_type:     'months',
      transaction_amount: planAmountInPesos,  // MP usa pesos, NO centavos
      currency_id:        'ARS',
    },
    back_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing/confirmacion`,
    status:   'pending',
  },
})

// subscription.id → guardar como mp_subscription_id en stores
// subscription.init_point → redirigir al usuario para pagar
```

### ⚠️ Gotchas de Mercado Pago

1. **MP usa pesos, no centavos** en `transaction_amount`. Si la DB guarda en centavos, dividir por 100 antes de enviar a MP.
2. **El webhook no es confiable solo** — siempre consultar el estado en la API de MP antes de procesar (ver template webhook).
3. **Credenciales test vs. producción** son diferentes. En desarrollo usar las de test. En producción cambiar en las env vars de Vercel.
4. **Webhooks en localhost no funcionan** — usar un tunnel (ngrok o cloudflared) para testear webhooks en dev.
5. **El `init_point`** es la URL a la que redirigir al usuario para completar el pago. Es diferente en sandbox vs. producción.

### Configurar webhook en MP Dashboard
- URL: `https://kitdigital.ar/api/webhooks/mercadopago/billing`
- Eventos: `subscription_preapproval` + `payment`
- Copiar el `Secret` generado → `MP_WEBHOOK_SECRET`

### Testing local de webhooks
```bash
# Opción 1: cloudflared (gratis)
cloudflared tunnel --url http://localhost:3000

# Opción 2: ngrok
ngrok http 3000
```
Configurar la URL del tunnel en MP Dashboard temporalmente para testing.

---

## Cloudinary

**SDK:** `cloudinary` (npm) + upload directo del browser
**Docs:** https://cloudinary.com/documentation/node_integration

### Instalar
```bash
npm install cloudinary
```

### Upload desde el browser (sin backend)
```typescript
// src/lib/cloudinary/upload.ts
export async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!)
  formData.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) throw new Error('Error al subir imagen')
  const data = await res.json()
  return data.secure_url as string
}
```

### Configurar upload preset (obligatorio)
1. Cloudinary Dashboard → Settings → Upload → Upload presets
2. Crear nuevo preset:
   - Preset name: `kitdigital_products` (o similar)
   - Signing mode: **Unsigned** (para uploads directos desde el browser)
   - Folder: `kitdigital/products`
3. Copiar el nombre del preset → `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### Transformaciones de imagen
```typescript
// Optimizar imagen para display en la vitrina
const optimizedUrl = imageUrl.replace(
  '/upload/',
  '/upload/f_auto,q_auto,w_400/'
)

// Thumbnail cuadrado para lista de productos
const thumbnailUrl = imageUrl.replace(
  '/upload/',
  '/upload/c_fill,w_200,h_200,f_auto,q_auto/'
)
```

### ⚠️ Gotchas de Cloudinary

1. **Upload presets unsigned** son los únicos que funcionan desde el browser sin exponer el API key.
2. **La carpeta en el preset** define dónde van los archivos. Usar `kitdigital/{store_id}/products` para organizar por tienda.
3. **El `secure_url`** siempre usa `https`. Usar ese, no el `url` (que puede ser `http`).
4. **Free tier**: 25 GB de storage y 25 GB de bandwidth. Suficiente para desarrollo y MVP.

---

## Upstash Redis

**SDK:** `@upstash/redis` y `@upstash/ratelimit` (npm)
**Docs:** https://upstash.com/docs/redis/sdks/ts/overview

### Instalar
```bash
npm install @upstash/redis @upstash/ratelimit
```

### Cliente Redis
```typescript
// src/lib/cache/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Helper get-or-set con TTL
export async function getOrSet<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = 300  // segundos
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached !== null) return cached

  const fresh = await fn()
  await redis.setex(key, ttl, JSON.stringify(fresh))
  return fresh
}

// Invalidar claves
export async function invalidateKeys(keys: string[]) {
  if (keys.length === 0) return
  await Promise.all(keys.map(k => redis.del(k)))
}
```

### Rate limiting
```typescript
// src/lib/cache/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { redis }     from './redis'

export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),  // 100 req/minuto
})

export const webhookRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 s'),   // 10 req/segundo (webhook de MP)
})
```

### Convención de keys de Redis
```
store:{store_id}:config                → configuración de la tienda
store:{store_id}:categories            → categorías activas
store:{store_id}:products:public       → productos para vitrina
store:{store_id}:modules               → módulos activos
```

### ⚠️ Gotchas de Upstash

1. **El plan free** tiene 10.000 comandos/día. Suficiente para desarrollo.
2. **TTL en `setex`**: el segundo parámetro es en **segundos** (no ms como en `setTimeout`).
3. **`redis.get()` retorna `null`** si la key no existe (no lanza error).
4. **Serialización**: Upstash serializa a JSON automáticamente, pero si guardás un objeto y leés como `string` puede traer problemas de tipo. Usar el genérico: `redis.get<TipoEsperado>(key)`.

---

## OpenAI

**SDK:** `openai` (npm)
**Docs:** https://platform.openai.com/docs/api-reference

### Instalar
```bash
npm install openai
```

### Cliente
```typescript
// src/lib/ai/client.ts
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})
```

### Llamada al modelo (Fase 6)
```typescript
import { openai } from '@/lib/ai/client'

const completion = await openai.chat.completions.create({
  model:       'gpt-4o-mini',    // modelo definido en /system
  messages:    messages,         // historial de la sesión
  temperature: 0.7,
  max_tokens:  1000,
  response_format: { type: 'json_object' },  // el asistente siempre responde en JSON
})

const content = completion.choices[0].message.content
const tokensUsed = completion.usage?.total_tokens ?? 0
```

### ⚠️ Gotchas de OpenAI

1. **`gpt-4o-mini`** es el modelo de este proyecto (balance costo/calidad). No cambiar a `gpt-4o` sin justificación.
2. **`response_format: { type: 'json_object' }`** requiere que el system prompt mencione explícitamente que la respuesta debe ser JSON.
3. **Timeouts**: la API de OpenAI puede tardar 8-15 segundos. En Vercel Hobby (10s timeout) puede ser un problema. Usar streaming o plan Pro.
4. **Tokens**: contar los tokens antes de hacer la llamada para verificar que no se excede el límite del plan. Ver `stores.ai_tokens_used` vs `stores.limits.ai_tokens`.

---

## Resumen de variables de entorno por servicio

| Servicio | Variables |
|----------|-----------|
| Mercado Pago | `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` |
| Cloudinary | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| OpenAI | `OPENAI_API_KEY` |

→ Valores completos en `/dev/infra/env-vars.md`
