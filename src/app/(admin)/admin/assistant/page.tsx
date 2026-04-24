'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ModuleGate } from '@/components/shared/module-gate'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { useAssistantChat } from '@/lib/hooks/use-assistant'
import { useStoreConfig } from '@/lib/hooks/use-store-config'
import type { ProposedAction } from '@/lib/actions/assistant'

type LocalMessage = {
  role: 'user' | 'assistant'
  content: string
  proposed_actions?: ProposedAction[]
  isOptimistic?: boolean
}

function parseAssistantMessage(content: string): { text: string; proposed_actions?: ProposedAction[] } {
  try {
    const parsed = JSON.parse(content) as { text?: string; actions?: ProposedAction[] }
    if (parsed.text) {
      return { text: parsed.text, proposed_actions: parsed.actions }
    }
  } catch {
    // no es JSON válido
  }
  return { text: content }
}

function TokenCounter({ used, limit }: { used: number; limit: number }) {
  if (limit <= 0) return null
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const isWarning = pct >= 80
  const isFull = pct >= 100

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border-b text-xs text-muted-foreground">
      <span className="shrink-0">Tokens IA:</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isFull ? 'bg-destructive' : isWarning ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums">
        {used.toLocaleString()} / {limit.toLocaleString()}
      </span>
    </div>
  )
}

function ActionCard({
  action,
  onConfirm,
  onIgnore,
  disabled,
}: {
  action: ProposedAction
  onConfirm: () => void
  onIgnore: () => void
  disabled?: boolean
}) {
  return (
    <Card className="mt-2 border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">{action.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{action.name}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={onIgnore}
              disabled={disabled}
            >
              <XCircle className="h-3.5 w-3.5" />
              Ignorar
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={onConfirm}
              disabled={disabled}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Confirmar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChatMessage({
  message,
  onConfirmAction,
  onIgnoreAction,
  isExecuting,
}: {
  message: LocalMessage
  onConfirmAction: (action: ProposedAction) => void
  onIgnoreAction: (action: ProposedAction) => void
  isExecuting?: boolean
}) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex items-end gap-2 max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
          <div className="shrink-0 mb-0.5">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const parsed = parseAssistantMessage(message.content)
  const actions = message.proposed_actions ?? parsed.proposed_actions ?? []

  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-2 max-w-[85%]">
        <div className="shrink-0 mt-0.5">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
            {message.isOptimistic ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Pensando...
              </span>
            ) : (
              parsed.text
            )}
          </div>
          {!message.isOptimistic && actions.length > 0 && (
            <div className="mt-1 space-y-1.5">
              {actions.map((action, i) => (
                <ActionCard
                  key={i}
                  action={action}
                  onConfirm={() => onConfirmAction(action)}
                  onIgnore={() => onIgnoreAction(action)}
                  disabled={isExecuting}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AssistantChatContent() {
  const { modules, limits } = useAdminContext()
  const { data: storeData } = useStoreConfig()
  const {
    messages: serverMessages,
    isLoading,
    isSending,
    isExecuting,
    handleSend,
    handleExecuteAction,
    currentSessionId,
  } = useAssistantChat()

  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])
  const [input, setInput] = useState('')
  const [ignoredActions, setIgnoredActions] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)

  // Sincronizar mensajes del servidor con estado local
  useEffect(() => {
    if (serverMessages.length > 0) {
      const mapped: LocalMessage[] = serverMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      setLocalMessages(mapped)
    }
  }, [serverMessages])

  // Scroll al fondo cuando llegan mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  const onSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || !currentSessionId || isSending) return

    setInput('')

    // Optimistic: agregar mensaje del user + loader del assistant
    setLocalMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '', isOptimistic: true },
    ])

    try {
      const response = await handleSend(trimmed)
      // Reemplazar el mensaje optimista con la respuesta real
      // (el useEffect de serverMessages se encarga cuando vuelva el query)
      void response
    } catch {
      // Remover el mensaje optimista en caso de error
      setLocalMessages((prev) => prev.filter((m) => !m.isOptimistic))
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void onSend()
    }
  }

  const onConfirmAction = async (action: ProposedAction) => {
    if (!currentSessionId) return
    await handleExecuteAction(action.name, action.input)
  }

  const onIgnoreAction = (action: ProposedAction) => {
    setIgnoredActions((prev) => new Set([...prev, `${action.name}-${JSON.stringify(action.input)}`]))
  }

  const displayMessages: LocalMessage[] = localMessages.map((m) => {
    if (m.role === 'assistant' && !m.isOptimistic) {
      const parsed = parseAssistantMessage(m.content)
      const filteredActions = (parsed.proposed_actions ?? []).filter(
        (a) => !ignoredActions.has(`${a.name}-${JSON.stringify(a.input)}`)
      )
      return { ...m, proposed_actions: filteredActions }
    }
    return m
  })

  const tokensUsed = storeData?.ai_tokens_used ?? 0
  const tokensLimit = limits.ai_tokens

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold">Asistente IA</h1>
          <p className="text-xs text-muted-foreground">Powered by GPT-4o-mini</p>
        </div>
        {modules.assistant && (
          <Badge variant="secondary" className="ml-auto text-xs">
            PRO
          </Badge>
        )}
      </div>

      {/* Token counter */}
      <TokenCounter used={tokensUsed} limit={tokensLimit} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4 ml-auto rounded-2xl" />
            <Skeleton className="h-14 w-4/5 rounded-2xl" />
          </div>
        )}

        {!isLoading && displayMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium mb-1">Tu asistente IA está listo</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Podés pedirme que cree productos, categorías, tareas, o que te ayude a gestionar tus pedidos.
            </p>
          </div>
        )}

        {displayMessages.map((message, i) => (
          <ChatMessage
            key={i}
            message={message}
            onConfirmAction={onConfirmAction}
            onIgnoreAction={onIgnoreAction}
            isExecuting={isExecuting}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribí tu consulta o pedido... (Enter para enviar)"
            className="min-h-[44px] max-h-32 resize-none text-sm"
            disabled={isSending || !currentSessionId}
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => void onSend()}
            disabled={!input.trim() || isSending || !currentSessionId}
            className="h-[44px] w-[44px] shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}

export default function AssistantPage() {
  const { modules } = useAdminContext()

  return (
    <ModuleGate module="assistant" activeModules={modules} showUpgradePrompt>
      <AssistantChatContent />
    </ModuleGate>
  )
}
