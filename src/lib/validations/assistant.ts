import { z } from 'zod'

export const getSessionSchema = z.object({
  session_id: z.string().uuid().optional(),
})

export const sendMessageSchema = z.object({
  session_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
})

export const executeActionSchema = z.object({
  session_id: z.string().uuid(),
  action_name: z.string().min(1),
  action_input: z.record(z.string(), z.unknown()),
})

export type GetSessionInput = z.infer<typeof getSessionSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type ExecuteActionInput = z.infer<typeof executeActionSchema>
