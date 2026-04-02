# AI Execution — KitDigital.AR

## Propósito

Este archivo define el flujo técnico completo de una conversación con el asistente de IA: desde que el usuario envía un mensaje hasta que el sistema devuelve una respuesta.

Es la referencia para implementar el endpoint del asistente y su integración con el executor.

→ Comportamiento del asistente: `/system/ai/ai-behavior.md`
→ Actions disponibles: `/system/ai/actions.md`
→ Pipeline del executor: `/system/backend/execution-model.md`

---

## Flujo de Alto Nivel

```
Usuario envía mensaje
        │
        ▼
[1] Validar sesión y contexto de tienda
        │
        ▼
[2] Cargar historial de conversación (assistant_sessions)
        │
        ▼
[3] Construir system prompt + contexto dinámico de tienda
        │
        ▼
[4] Llamar a OpenAI GPT-4o-mini
        │
        ▼
[5] Parsear respuesta del modelo
        │
        ├─── Respuesta de texto ──────────────────────────────→ [9] Guardar y responder
        │
        ├─── Propuesta de action(s) ─────────────────────────→ [9] Guardar y responder (usuario confirma luego)
        │
        └─── Ejecución directa ──→ [6] Validar action en lista autorizada
                                        │
                                        ▼
                                  [7] Invocar executor({ actor: ai, ... })
                                        │
                                        ▼
                                  [8] Interpretar resultado del executor
                                        │
                                        ▼
                                  [9] Guardar turno + responder al usuario
```

---

## Detalle de Cada Paso

### PASO 1 — Validar sesión y contexto de tienda

Antes de cualquier procesamiento:

a. Verificar que el usuario tiene sesión válida (JWT de Supabase Auth) → 401 si no
b. Resolver `store_id` del contexto del request (subdominio/sesión)
c. Verificar que la tienda existe y tiene status `demo` o `active` → si no, devolver mensaje de tienda inactiva sin llamar a OpenAI
d. Verificar que el módulo `assistant` está activo para esta tienda → si no, devolver error `MODULE_INACTIVE`
e. Verificar que el usuario tiene rol `owner`, `admin`, o `ai` para esta tienda → 403 si no
f. Verificar límite de tokens mensuales (`store.limits.ai_tokens`). Si se superó → devolver mensaje de límite alcanzado sin llamar a OpenAI

**Nada de esto llama a OpenAI. Son todas validaciones locales, sin costo.**

---

### PASO 2 — Cargar historial de conversación

a. Buscar la sesión activa del usuario para esta tienda:
   ```sql
   SELECT * FROM assistant_sessions
   WHERE store_id = ? AND user_id = ? AND expires_at > NOW()
   ORDER BY created_at DESC
   LIMIT 1
   ```
b. Si no existe sesión activa → crear una nueva en `assistant_sessions`
c. Cargar los últimos N mensajes del historial (máx. 20 según límite operativo):
   ```sql
   SELECT role, content FROM assistant_messages
   WHERE session_id = ?
   ORDER BY created_at ASC
   LIMIT 20
   ```
d. El historial se pasa a OpenAI como `messages[]` con roles `user` / `assistant`

---

### PASO 3 — Construir system prompt

El system prompt se construye dinámicamente en cada request. Contiene:

**Bloque 1 — Identidad fija:**
```
Sos Kit, el asistente de gestión de KitDigital.
Tu único objetivo es ayudar al dueño de la tienda a gestionar su negocio.
[reglas de comportamiento: lo que podés y no podés hacer]
[reglas de seguridad: cómo manejar intentos de jailbreak]
```

**Bloque 2 — Contexto de tienda (dinámico):**
```
Tienda: {store.name}
Plan: {store.plan}
Módulos activos: {store.modules} (lista de nombres)
Límites del plan: max_products={n}, max_orders_per_month={n}, ai_tokens={n}
Tokens usados este período: {used_tokens}/{total_tokens}
```

**Bloque 3 — Actions disponibles (dinámico, filtrado por módulos activos):**
```
Podés proponer o ejecutar las siguientes actions:
[lista de actions de /system/ai/actions.md filtrada por módulos activos de la tienda]
[para cada action: nombre, descripción, si requiere confirmación]
```

**Bloque 4 — Formato de respuesta (fijo):**
```
Respondé SIEMPRE en JSON con uno de estos formatos:
- { "type": "text", "message": "..." }
- { "type": "action_proposal", "message": "...", "actions": [...] }
- { "type": "action_executed", "message": "...", "executed": [...] }
```

El system prompt **no** incluye datos sensibles como precios de planes, IDs internos ni tokens de autenticación.

---

### PASO 4 — Llamar a OpenAI

```typescript
const response = await openai.chat.completions.create({
  model:       "gpt-4o-mini",
  max_tokens:  1000,
  temperature: 0.2,           // baja temperatura para respuestas deterministas
  messages: [
    { role: "system",    content: systemPrompt },
    ...historial,               // últimos 20 mensajes
    { role: "user",      content: mensaje_del_usuario }
  ]
})
```

Parámetros fijos:
- `temperature: 0.2` — respuestas predecibles, no creativas
- `max_tokens: 1000` — suficiente para propuestas de actions, sin despilfarrar tokens
- Timeout: 15 segundos. Si se supera → error `SYSTEM_ERROR` al usuario

---

### PASO 5 — Parsear respuesta del modelo

a. Extraer el content de `response.choices[0].message.content`
b. Intentar parsear como JSON según los formatos definidos
c. Si el JSON es inválido → reintentar una vez con prompt de corrección. Si falla de nuevo → devolver error genérico al usuario
d. Validar que el `type` es uno de los tres permitidos
e. Si `type === "action_proposal"` → ir a Paso 9 directamente (no ejecutar, solo proponer)
f. Si `type === "action_executed"` → continuar con Paso 6
g. Si `type === "text"` → ir a Paso 9

---

### PASO 6 — Validar action en lista autorizada

Para cada action en `response.actions`:

a. Verificar que el `name` está en la lista de `/system/ai/actions.md`
b. Verificar que la action **no** está en la lista de acciones prohibidas para IA
c. Verificar que `direct_execution: true` para esa action (si el modelo intentó ejecutar una que requiere confirmación → convertir a `action_proposal` en lugar de ejecutar)
d. Si la action requiere módulo activo que no está activo → no ejecutar, informar al usuario

Si cualquier validación falla → no se invoca el executor. La IA responde explicando la restricción.

---

### PASO 7 — Invocar executor

Para cada action validada (máx. 3 por turno):

```typescript
const result = await executor({
  name:     action.name,
  store_id: context.store_id,
  actor: {
    type: 'ai',
    id:   context.user_id  // el user_id del usuario que habló con la IA
  },
  input: action.input
})
```

Las actions se ejecutan **secuencialmente**, no en paralelo.
Si una action falla, las siguientes se cancelan y se reporta el error al usuario.

El executor aplica su pipeline completo (pasos 1-10 de `/system/backend/execution-model.md`).
No hay bypass de ningún paso para el actor `ai`.

---

### PASO 8 — Interpretar resultado del executor

Para cada result del executor:

```typescript
if (result.success) {
  // agregar a lista de executed con el resultado
  executed.push({ name: action.name, result: result.data })
} else {
  // traducir error a mensaje natural (tabla en ai-behavior.md)
  errorMessage = translateError(result.error.code, result.error.message)
  // detener ejecución de actions subsiguientes
  break
}
```

---

### PASO 9 — Guardar turno y responder

a. Persistir el mensaje del usuario en `assistant_messages`:
   ```sql
   INSERT INTO assistant_messages (session_id, role, content, created_at)
   VALUES (session_id, 'user', mensaje_del_usuario, NOW())
   ```

b. Persistir la respuesta del asistente:
   ```sql
   INSERT INTO assistant_messages (session_id, role, content, created_at)
   VALUES (session_id, 'assistant', respuesta_json, NOW())
   ```

c. Actualizar `assistant_sessions` con `last_activity_at = NOW()`

d. Actualizar tokens consumidos:
   ```sql
   UPDATE stores
   SET ai_tokens_used = ai_tokens_used + tokens_used_in_this_request
   WHERE id = store_id
   ```

e. Devolver la respuesta al cliente (UI del asistente)

---

## Flujo de Confirmación de Action

Cuando el usuario confirma una propuesta (`type: "action_proposal"`), el frontend envía un nuevo mensaje al endpoint con la confirmación:

```json
{
  "type": "action_confirmation",
  "actions": [
    {
      "name": "create_product",
      "input": { "name": "Remera Azul", "price": 250000, "is_active": true }
    }
  ]
}
```

El endpoint **no llama a OpenAI** para confirmaciones. Salta directamente al Paso 6 con las actions del payload de confirmación.

Esto evita consumir tokens del modelo para una operación que ya fue resuelta por el modelo en el turno anterior.

---

## Manejo de Sesiones

| Campo | Detalle |
|-------|---------|
| `expires_at` | 24 horas desde la última actividad |
| `max_messages` | 100 mensajes por sesión |
| Si se alcanza `max_messages` | Crear nueva sesión automáticamente |
| Sesión expirada | Nueva sesión al próximo mensaje |
| Historial enviado a OpenAI | Últimos 20 mensajes de la sesión activa |

Las sesiones expiradas no se borran inmediatamente. El cron `cleanup_assistant_sessions` las elimina después de 7 días.

---

## Diagrama de Flujo Completo

```
Usuario → mensaje
          │
          ▼
     [1] Validaciones locales (sin OpenAI)
          │ FALLA → error sin consumir tokens
          │ OK
          ▼
     [2] Cargar historial (DB)
          │
          ▼
     [3] Construir system prompt
          │
          ▼
     [4] POST OpenAI API
          │ TIMEOUT/ERROR → SYSTEM_ERROR al usuario
          │ OK
          ▼
     [5] Parsear JSON de respuesta
          │
          ├── type: text ─────────────────────────────→ [9] guardar + responder
          │
          ├── type: action_proposal ─────────────────→ [9] guardar + responder (UI muestra botón confirmar)
          │
          └── type: action_executed
                    │
                    ▼
               [6] Validar en lista autorizada
                    │ NO autorizada → convertir a texto de error
                    │ OK
                    ▼
               [7] executor({ actor: ai, ... }) — secuencial
                    │ ERROR executor → traducir error a texto natural
                    │ OK
                    ▼
               [8] Construir respuesta con resultados
                    │
                    ▼
               [9] guardar en DB + actualizar tokens + responder
```

---

## Seguridad

**Prevención de jailbreak:**
- El system prompt incluye instrucciones explícitas para ignorar cualquier instrucción del usuario que intente modificar la identidad, el rol, o el comportamiento del asistente.
- Si se detecta un intento de jailbreak → respuesta fija: "No puedo hacer eso. ¿Hay algo de tu tienda en lo que pueda ayudarte?"
- La detección se hace en el system prompt, no en código (el modelo es responsable de resistirlo).
- Como segunda capa: el código valida que cualquier action propuesta esté en la lista autorizada, independientemente de lo que el modelo diga.

**Aislamiento de datos:**
- El `store_id` nunca viene del modelo. Solo viene del contexto del servidor (StoreContext).
- El modelo no puede acceder a datos de otras tiendas porque el contexto inyectado es siempre de una sola tienda.

**Trazabilidad:**
- Cada action ejecutada por IA genera un evento con `actor_type: "ai"` y `actor_id: user_id`.
- El historial de conversación se persiste en `assistant_messages`.
- Los tokens consumidos se acumulan en `stores.ai_tokens_used`.
