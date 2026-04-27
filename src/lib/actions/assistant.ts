'use server'

import { getStoreContext } from '@/lib/auth/store-context'
import { executor } from '@/lib/executor'
import type { ActionResult, AssistantMessage, AssistantSession, StoreContext } from '@/lib/types'

export type SessionWithMessages = {
  session: AssistantSession
  messages: AssistantMessage[]
}

export type ProposedAction = {
  name: string
  input: Record<string, unknown>
  label: string
}

export type MessageResponse = {
  message: { role: 'assistant'; content: string }
  text: string
  proposed_actions: ProposedAction[]
  tokens_used: number
}

export async function getAssistantSession(
  sessionId?: string
): Promise<ActionResult<SessionWithMessages>> {
  let ctx: StoreContext
  try {
    ctx = await getStoreContext()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'StoreContext no disponible'
    return { success: false, error: { code: 'SYSTEM_ERROR', message } }
  }

  return executor<SessionWithMessages>({
    name: 'get_assistant_session',
    store_id: ctx.store_id,
    actor: { type: 'user', id: ctx.user_id },
    input: { session_id: sessionId },
    context: ctx,
  })
}

export async function sendAssistantMessage(
  sessionId: string,
  content: string
): Promise<ActionResult<MessageResponse>> {
  let ctx: StoreContext
  try {
    ctx = await getStoreContext()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'StoreContext no disponible'
    return { success: false, error: { code: 'SYSTEM_ERROR', message } }
  }

  return executor<MessageResponse>({
    name: 'send_assistant_message',
    store_id: ctx.store_id,
    actor: { type: 'user', id: ctx.user_id },
    input: { session_id: sessionId, content },
    context: ctx,
  })
}

export async function executeAssistantAction(
  sessionId: string,
  actionName: string,
  actionInput: Record<string, unknown>
): Promise<ActionResult<unknown>> {
  let ctx: StoreContext
  try {
    ctx = await getStoreContext()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'StoreContext no disponible'
    return { success: false, error: { code: 'SYSTEM_ERROR', message } }
  }

  return executor<unknown>({
    name: 'execute_assistant_action',
    store_id: ctx.store_id,
    actor: { type: 'user', id: ctx.user_id },
    input: { session_id: sessionId, action_name: actionName, action_input: actionInput },
    context: ctx,
  })
}
