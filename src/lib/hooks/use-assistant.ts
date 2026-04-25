'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAssistantSession,
  sendAssistantMessage,
  executeAssistantAction,
  type MessageResponse,
  type SessionWithMessages,
} from '@/lib/actions/assistant'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys } from '@/lib/hooks/query-keys'

export function useAssistantSession(sessionId?: string) {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.assistantSession(store_id),
    queryFn: async () => {
      const result = await getAssistantSession(sessionId)
      if (!result.success) throw new Error(result.error.message)
      return result.data as SessionWithMessages
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      const result = await sendAssistantMessage(sessionId, content)
      if (!result.success) throw new Error(result.error.message)
      return result.data as MessageResponse
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assistantSession(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.storeConfig(store_id) })
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useExecuteAssistantAction() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async ({
      sessionId,
      actionName,
      actionInput,
    }: {
      sessionId: string
      actionName: string
      actionInput: Record<string, unknown>
    }) => {
      const result = await executeAssistantAction(sessionId, actionName, actionInput)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assistantSession(store_id) })
      // Invalidar queries relacionadas que pueden haber cambiado
      queryClient.invalidateQueries({ queryKey: ['products', store_id] })
      queryClient.invalidateQueries({ queryKey: ['categories', store_id] })
      queryClient.invalidateQueries({ queryKey: ['tasks', store_id] })
      queryClient.invalidateQueries({ queryKey: ['orders', store_id] })
      toast.success('Acción ejecutada correctamente')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useAssistantTokens() {
  const { limits } = useAdminContext()
  const { data: sessionData } = useAssistantSession()

  // Los tokens usados vienen del store context limits, pero necesitamos el actual de la sesión
  // Por ahora devolvemos los del context que se actualizan con cada server action
  return {
    limit: limits.ai_tokens,
    used: 0, // Se actualizará cuando tengamos el dato desde la DB
  }
}

/** Hook compuesto que maneja toda la lógica del chat */
export function useAssistantChat() {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const { data, isLoading, error } = useAssistantSession(sessionId)
  const sendMessage = useSendMessage()
  const executeAction = useExecuteAssistantAction()

  // Una vez que tenemos sesión, guardamos el ID
  const currentSessionId = data?.session?.id ?? sessionId

  const handleSend = async (content: string) => {
    if (!currentSessionId) return
    await sendMessage.mutateAsync({ sessionId: currentSessionId, content })
  }

  const handleExecuteAction = async (
    actionName: string,
    actionInput: Record<string, unknown>
  ) => {
    if (!currentSessionId) return
    await executeAction.mutateAsync({
      sessionId: currentSessionId,
      actionName,
      actionInput,
    })
  }

  // Si la sesión no existe aún, disparar la creación
  const initSession = (id?: string) => setSessionId(id)

  return {
    session: data?.session,
    messages: data?.messages ?? [],
    isLoading,
    error,
    isSending: sendMessage.isPending,
    isExecuting: executeAction.isPending,
    handleSend,
    handleExecuteAction,
    initSession,
    currentSessionId,
  }
}
