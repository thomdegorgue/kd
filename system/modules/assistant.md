# Module: assistant

## Purpose

Incorpora un asistente de inteligencia artificial dentro del panel del dueño.

El asistente ayuda a crear contenido, configurar la tienda, generar descripciones de productos y orientar al usuario en el uso del sistema.

**Regla absoluta:** el assistant NO define lógica de negocio propia. Únicamente orquesta y propone actions ya definidas en otros módulos. Toda action que el assistant sugiere pasa por el executor con validación completa antes de ejecutarse.

→ Comportamiento general de IA: `/system/ai/ai-behavior.md`
→ Pipeline de ejecución: `/system/ai/execution.md`
→ Actions disponibles para IA: `/system/ai/actions.md`

## Dependencies

- `catalog` — accede a datos de la tienda para contextualizar sus respuestas
- `products` — puede sugerir y proponer creación/edición de productos
- `categories` — puede sugerir creación de categorías
- `orders` — puede consultar pedidos para dar contexto al dueño
- `banners` — puede sugerir textos para banners
- `social` — puede sugerir links de redes sociales
- `product_page` — puede generar contenido extendido de producto
- `finance` / `expenses` — puede dar resúmenes de estado financiero (solo lectura)
- Todos los módulos activos son contexto disponible para el assistant

## Data Impact

### Entities owned
- No crea tablas propias de negocio. El assistant no tiene entidades de dominio propias.
- Puede utilizar una tabla `assistant_sessions` para contexto de conversación (ephemeral, no es dato de negocio crítico).

### Fields
- `assistant_session.id` — UUID
- `assistant_session.store_id` — UUID
- `assistant_session.user_id` — UUID
- `assistant_session.context` (JSONB) — historial de mensajes del turno actual
- `assistant_session.created_at`, `assistant_session.expires_at` — la sesión expira automáticamente

### Relationships
- Una `assistant_session` pertenece a una `store` y a un `user`

### External reads
- Todos los módulos activos de la tienda — el assistant lee datos para contextualizar sus respuestas:
  - `products` — para sugerir mejoras o completar información
  - `orders` — para dar resúmenes o alertas al dueño
  - `finance_entries` / `expenses` — para dar contexto financiero
  - `store` — nombre, config, módulos activos

## Actions

### `send_assistant_message`
- **Actor:** user
- **requires:** [`assistant`]
- **permissions:** owner, admin
- **input:** `{ message: string, session_id?: UUID }`
- **output:** `{ session_id, response: string, proposed_actions?: [{ action, data, description }] }`
- **errors:** `MODULE_INACTIVE`, `LIMIT_EXCEEDED` (ai_tokens), `UNAUTHORIZED`, `EXTERNAL_ERROR` (fallo de OpenAI)
- **nota:** el assistant puede devolver texto de respuesta + una lista de actions propuestas para que el usuario confirme. Las actions propuestas NO se ejecutan automáticamente; son propuestas.

### `execute_assistant_action`
- **Actor:** user
- **requires:** [`assistant`]
- **permissions:** owner, admin
- **input:** `{ action: string, data: object, session_id?: UUID }`
- **output:** resultado de la action ejecutada (delegado al executor)
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`, y todos los errores posibles de la action delegada
- **nota:** esta action toma una propuesta del assistant y la pasa al executor. El executor aplica el pipeline completo: valida módulo, límites, input, y ejecuta. El assistant no bypasea ninguna validación.

### `get_assistant_session`
- **Actor:** user
- **requires:** [`assistant`]
- **permissions:** owner, admin
- **input:** `{ session_id }`
- **output:** `assistant_session` con historial
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

## UI Components

- `AssistantChat` — interfaz de chat del asistente (mensajes, input, historial)
- `AssistantMessageBubble` — burbuja de mensaje del asistente y del usuario
- `AssistantActionCard` — tarjeta de acción propuesta con botón "Aplicar" para confirmar
- `AssistantTokenBadge` — indicador de tokens restantes del período
- `AssistantTriggerButton` — botón flotante o en navbar para abrir el chat

## Constraints

- El assistant NO ejecuta ninguna action sin confirmación explícita del usuario a través de `execute_assistant_action`.
- El límite de `ai_tokens` del plan se consume por cada llamada a `send_assistant_message`. Al agotarse, el módulo devuelve `LIMIT_EXCEEDED` hasta el próximo período.
- El assistant solo propone actions que están listadas en `/system/ai/actions.md` como disponibles para IA.
- El assistant no puede proponer actions que el usuario no tiene permiso de ejecutar.
- `assistant_session` tiene TTL de 24 horas. Después expira y el contexto se limpia.
- El assistant no puede acceder a datos de billing, ni a datos de otras tiendas.

## Edge Cases

- **Acción propuesta por el assistant que falla en el executor:** el executor devuelve el error al usuario con el mensaje correspondiente. El assistant puede sugerir una alternativa en el turno siguiente.
- **Usuario con tokens agotados:** el módulo devuelve `LIMIT_EXCEEDED`. La UI informa al usuario y ofrece actualizar el plan.
- **Respuesta de OpenAI con error temporal:** `EXTERNAL_ERROR` con retry sugerido. El sistema no falla silenciosamente.
- **Assistant sin módulos activos suficientes:** si la tienda solo tiene el CORE activo, el assistant limita sus sugerencias a las actions disponibles en esos módulos.

## Future Extensions

- Tipos especializados de assistant: onboarding (guía al nuevo usuario), contenido (foco en marketing), operativo (foco en pedidos y stock).
- Proactive suggestions: el assistant detecta oportunidades sin que el usuario pregunte (ej: "Tenés 3 productos sin descripción").
- Entrenamiento contextual con el historial de la tienda.
