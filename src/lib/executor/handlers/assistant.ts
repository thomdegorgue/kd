import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import {
  getSessionSchema,
  sendMessageSchema,
  executeActionSchema,
} from '@/lib/validations/assistant'
import type { AssistantMessage, AssistantSession } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// Acciones que el assistant puede proponer (subset seguro)
const ALLOWED_AI_ACTIONS = [
  'create_product',
  'update_product',
  'create_category',
  'create_task',
  'update_order_status',
]

// ── get_assistant_session ────────────────────────────────────

registerHandler({
  name: 'get_assistant_session',
  requires: ['assistant'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: (input) => {
    const result = getSessionSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { session_id } = getSessionSchema.parse(input)
    const now = new Date().toISOString()

    let session: AssistantSession | null = null

    // Intentar reutilizar sesión existente si se pasó session_id
    if (session_id) {
      const { data } = await db
        .from('assistant_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('store_id', context.store_id)
        .gt('expires_at', now)
        .single()

      session = data ?? null
    }

    // Si no hay sesión válida, crear una nueva
    if (!session) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await db
        .from('assistant_sessions')
        .insert({
          store_id: context.store_id,
          user_id: context.user_id,
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)
      session = data as AssistantSession
    } else {
      // Actualizar last_activity_at
      await db
        .from('assistant_sessions')
        .update({ last_activity_at: now })
        .eq('id', session.id)
    }

    // Cargar últimos 50 mensajes de la sesión
    const { data: messages, error: msgError } = await db
      .from('assistant_messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(50)

    if (msgError) throw new Error(msgError.message)

    return {
      session: session as AssistantSession,
      messages: (messages ?? []) as AssistantMessage[],
    }
  },
})

// ── send_assistant_message ───────────────────────────────────

registerHandler({
  name: 'send_assistant_message',
  requires: ['assistant'],
  permissions: ['owner', 'admin', 'collaborator'],
  limits: {
    field: 'ai_tokens',
    countQuery: async (storeId: string) => {
      const { data } = await db
        .from('stores')
        .select('ai_tokens_used')
        .eq('id', storeId)
        .single()
      return (data?.ai_tokens_used ?? 0) as number
    },
  },
  event_type: 'assistant_message_sent',
  invalidates: ['assistant_session:{store_id}'],
  validate: (input) => {
    const result = sendMessageSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { session_id, content } = sendMessageSchema.parse(input)
    const now = new Date().toISOString()

    // Verificar que la sesión existe y no expiró
    const { data: session } = await db
      .from('assistant_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('store_id', context.store_id)
      .gt('expires_at', now)
      .single()

    if (!session) throw new Error('Sesión no encontrada o expirada')

    // Obtener datos de la tienda (nombre + tokens usados + plan)
    const { data: store } = await db
      .from('stores')
      .select('name, ai_tokens_used, ai_tokens_reset_at, plan_id')
      .eq('id', context.store_id)
      .single()

    const storeName = (store?.name as string | null) ?? 'tu tienda'

    // Verificar límite mensual de tokens
    const { data: planData } = await db
      .from('plans')
      .select('ai_tokens_monthly')
      .eq('id', store?.plan_id)
      .single()

    const monthlyLimit = (planData?.ai_tokens_monthly as number | null) ?? 50000
    const currentUsed = (store?.ai_tokens_used as number | null) ?? 0

    if (monthlyLimit > 0 && currentUsed >= monthlyLimit) {
      throw new Error(
        `Límite mensual de ${monthlyLimit.toLocaleString('es-AR')} tokens alcanzado. El contador se reinicia el próximo mes.`
      )
    }

    // Guardar mensaje del usuario
    const { error: insertUserErr } = await db
      .from('assistant_messages')
      .insert({
        session_id,
        store_id: context.store_id,
        role: 'user',
        content,
      })

    if (insertUserErr) throw new Error(insertUserErr.message)

    // Traer historial reciente (últimos 10 mensajes) para contexto
    const { data: history } = await db
      .from('assistant_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const historyMessages = ((history ?? []) as Array<{ role: string; content: string }>)
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // Llamar a OpenAI
    const systemPrompt = `Sos el asistente IA de "${storeName}", una tienda en KitDigital.ar. Ayudás al dueño a gestionar su negocio respondiendo en español.

Cuando el usuario te pide realizar una acción, respondé SIEMPRE con un JSON válido en este formato:
{ "text": "explicación breve", "actions": [{ "name": "action_name", "input": {}, "label": "descripción para el usuario" }] }

Cuando es solo una consulta o pregunta, respondé con:
{ "text": "tu respuesta" }

Acciones disponibles que podés proponer:
- create_product: { name: string, price: number, description?: string }
- update_product: { id: string, name?: string, price?: number, description?: string }
- create_category: { name: string, description?: string }
- create_task: { title: string, description?: string, due_date?: string }
- update_order_status: { id: string, status: "pending"|"confirmed"|"preparing"|"delivered"|"cancelled" }

IMPORTANTE: Solo proponés acciones de la lista de arriba. Si el usuario pide algo que no está en la lista, explicale que no podés hacer eso pero ofrecé alternativas. Siempre respondé con JSON válido.`

    let assistantContent = ''
    let tokensUsed = 0

    try {
      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      })

      assistantContent = response.choices[0]?.message?.content ?? '{ "text": "No pude generar una respuesta." }'
      tokensUsed = response.usage?.total_tokens ?? 0
    } catch (err) {
      throw new Error(`Error al llamar a OpenAI: ${err instanceof Error ? err.message : 'error desconocido'}`)
    }

    // Actualizar contador de tokens en la tienda
    if (tokensUsed > 0) {
      await db.rpc('increment_ai_tokens', {
        p_store_id: context.store_id,
        p_tokens: tokensUsed,
      }).catch(() => {
        // Si la RPC no existe, hacer update manual
        db.from('stores')
          .select('ai_tokens_used')
          .eq('id', context.store_id)
          .single()
          .then(({ data: s }: { data: { ai_tokens_used: number } | null }) => {
            return db
              .from('stores')
              .update({ ai_tokens_used: (s?.ai_tokens_used ?? 0) + tokensUsed })
              .eq('id', context.store_id)
          })
      })
    }

    // Guardar respuesta del assistant
    const { error: insertAssistantErr } = await db
      .from('assistant_messages')
      .insert({
        session_id,
        store_id: context.store_id,
        role: 'assistant',
        content: assistantContent,
      })

    if (insertAssistantErr) throw new Error(insertAssistantErr.message)

    // Actualizar last_activity_at
    await db
      .from('assistant_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session_id)

    // Parsear propuestas de acciones del JSON
    let parsedResponse: { text: string; actions?: Array<{ name: string; input: Record<string, unknown>; label: string }> } = { text: assistantContent }
    try {
      const parsed = JSON.parse(assistantContent) as typeof parsedResponse
      if (parsed.text) {
        parsedResponse = parsed
      }
    } catch {
      parsedResponse = { text: assistantContent }
    }

    // Filtrar acciones no permitidas
    const proposedActions = (parsedResponse.actions ?? []).filter(
      (a) => ALLOWED_AI_ACTIONS.includes(a.name)
    )

    return {
      message: {
        role: 'assistant' as const,
        content: assistantContent,
      },
      text: parsedResponse.text,
      proposed_actions: proposedActions,
      tokens_used: tokensUsed,
    }
  },
})

// ── execute_assistant_action ─────────────────────────────────

registerHandler({
  name: 'execute_assistant_action',
  requires: ['assistant'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: 'assistant_action_executed',
  invalidates: [],
  validate: (input) => {
    const result = executeActionSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    const { action_name } = input as { action_name: string }
    if (!ALLOWED_AI_ACTIONS.includes(action_name)) {
      return { valid: false, code: 'UNAUTHORIZED', message: `Acción '${action_name}' no permitida para el asistente` }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { session_id, action_name, action_input } = executeActionSchema.parse(input)
    const now = new Date().toISOString()

    // Verificar que la sesión existe y no expiró
    const { data: session } = await db
      .from('assistant_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('store_id', context.store_id)
      .gt('expires_at', now)
      .single()

    if (!session) throw new Error('Sesión no encontrada o expirada')

    // Ejecutar la acción como actor 'ai' (import dinámico para evitar circular dependency)
    const { executor } = await import('@/lib/executor')

    const result = await executor({
      name: action_name,
      store_id: context.store_id,
      actor: { type: 'ai', id: null },
      input: action_input,
      context,
    })

    // Registrar el resultado como mensaje del assistant
    const resultContent = JSON.stringify({
      text: result.success
        ? `Acción ejecutada correctamente.`
        : `Error al ejecutar la acción: ${result.error.message}`,
      action_result: result,
    })

    await db
      .from('assistant_messages')
      .insert({
        session_id,
        store_id: context.store_id,
        role: 'assistant',
        content: resultContent,
      })

    return result
  },
})
