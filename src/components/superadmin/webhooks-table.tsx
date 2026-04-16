'use client'

import { useState } from 'react'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WebhookLogRow } from '@/lib/db/queries/superadmin'

const STATUS_COLORS: Record<string, string> = {
  processed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
}

type Props = {
  initialItems: WebhookLogRow[]
  total: number
}

export function WebhooksTable({ initialItems, total }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = initialItems.filter((w) => {
    const matchSearch =
      !search ||
      w.mp_event_id.toLowerCase().includes(search.toLowerCase()) ||
      w.topic.toLowerCase().includes(search.toLowerCase()) ||
      (w.store as { slug: string } | null)?.slug?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || w.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por evento, topic o tienda..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="processed">Procesados</SelectItem>
            <SelectItem value="failed">Fallidos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {total} webhooks
      </p>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-6 px-2 py-2" />
                <th className="text-left px-4 py-2 font-medium">Evento MP</th>
                <th className="text-left px-4 py-2 font-medium">Topic</th>
                <th className="text-left px-4 py-2 font-medium">Tienda</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-left px-4 py-2 font-medium">ms</th>
                <th className="text-left px-4 py-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((wh) => {
                const store = wh.store as { slug: string } | null
                const isExpanded = expandedId === wh.id
                return (
                  <>
                    <tr
                      key={wh.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : wh.id)}
                    >
                      <td className="px-2 py-3 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs truncate max-w-[140px]">
                        {wh.mp_event_id}
                      </td>
                      <td className="px-4 py-3 text-xs">{wh.topic}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {store?.slug ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${STATUS_COLORS[wh.status] ?? ''} hover:${STATUS_COLORS[wh.status] ?? ''} text-xs`}
                        >
                          {wh.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {wh.processing_time_ms ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {wh.processed_at
                          ? new Date(wh.processed_at).toLocaleString('es-AR')
                          : '—'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${wh.id}-detail`} className="bg-muted/20">
                        <td />
                        <td colSpan={6} className="px-4 py-3 space-y-2">
                          {wh.result && (
                            <p className="text-xs">
                              <span className="font-medium">Resultado: </span>
                              {wh.result}
                            </p>
                          )}
                          {wh.error && (
                            <p className="text-xs text-destructive">
                              <span className="font-medium">Error: </span>
                              {wh.error}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
