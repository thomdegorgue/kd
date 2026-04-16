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
import type { EventRow } from '@/lib/db/queries/superadmin'

const ACTOR_COLORS: Record<string, string> = {
  user: 'bg-blue-100 text-blue-800',
  superadmin: 'bg-purple-100 text-purple-800',
  system: 'bg-muted text-muted-foreground',
  ai: 'bg-emerald-100 text-emerald-800',
}

type Props = {
  initialItems: EventRow[]
  total: number
}

export function EventsTable({ initialItems, total }: Props) {
  const [search, setSearch] = useState('')
  const [actorFilter, setActorFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = initialItems.filter((e) => {
    const matchSearch =
      !search ||
      e.type.toLowerCase().includes(search.toLowerCase()) ||
      (e.store as { slug: string } | null)?.slug?.toLowerCase().includes(search.toLowerCase())
    const matchActor = actorFilter === 'all' || e.actor_type === actorFilter
    return matchSearch && matchActor
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tipo o tienda..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={actorFilter} onValueChange={(v) => setActorFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Actor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
            <SelectItem value="superadmin">Superadmin</SelectItem>
            <SelectItem value="system">Sistema</SelectItem>
            <SelectItem value="ai">IA</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {total} eventos
      </p>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-6 px-2 py-2" />
                <th className="text-left px-4 py-2 font-medium">Tipo</th>
                <th className="text-left px-4 py-2 font-medium">Actor</th>
                <th className="text-left px-4 py-2 font-medium">Tienda</th>
                <th className="text-left px-4 py-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((event) => {
                const store = event.store as { slug: string } | null
                const isExpanded = expandedId === event.id
                return (
                  <>
                    <tr
                      key={event.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <td className="px-2 py-3 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{event.type}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`${ACTOR_COLORS[event.actor_type] ?? ''} hover:${ACTOR_COLORS[event.actor_type] ?? ''} text-xs`}
                        >
                          {event.actor_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {store?.slug ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(event.created_at).toLocaleString('es-AR')}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${event.id}-data`} className="bg-muted/20">
                        <td />
                        <td colSpan={4} className="px-4 py-3">
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(event.data, null, 2)}
                          </pre>
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
