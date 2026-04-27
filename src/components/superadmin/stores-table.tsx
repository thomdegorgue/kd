'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ExternalLink, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter, usePathname } from 'next/navigation'
import type { StoreListItem } from '@/lib/db/queries/superadmin'
import { PRO_MODULES } from '@/lib/billing/calculator'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useEffect } from 'react'

function BillingBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Activa', className: 'bg-emerald-100 text-emerald-800' },
    demo: { label: 'Trial', className: 'bg-blue-100 text-blue-800' },
    past_due: { label: 'Mora', className: 'bg-amber-100 text-amber-800' },
    suspended: { label: 'Suspendida', className: 'bg-orange-100 text-orange-800' },
    archived: { label: 'Archivada', className: 'bg-muted text-muted-foreground' },
  }
  const { label, className } = map[status] ?? { label: status, className: '' }
  return <Badge className={`${className} hover:${className}`}>{label}</Badge>
}

type Props = {
  initialItems: StoreListItem[]
  total: number
  page: number
  pageSize: number
  initialSearch?: string
  initialStatus?: string
}

export function StoresTable({ initialItems, total, page, pageSize, initialSearch, initialStatus }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(initialSearch ?? '')
  const [statusFilter, setStatusFilter] = useState(initialStatus ?? 'all')
  const debouncedSearch = useDebounce(search, 400)
  const totalPages = Math.ceil(total / pageSize)

  const buildUrl = (p: number, s: string, st: string) => {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (s) params.set('search', s)
    if (st !== 'all') params.set('status', st)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  useEffect(() => {
    startTransition(() => {
      router.push(buildUrl(1, debouncedSearch, statusFilter))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter])

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(buildUrl(newPage, debouncedSearch, statusFilter))
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o slug..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="demo">Trial</SelectItem>
            <SelectItem value="past_due">En mora</SelectItem>
            <SelectItem value="archived">Archivadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} tiendas · página {page} de {totalPages || 1}
      </p>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Tienda</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-left px-4 py-2 font-medium">Tier</th>
                <th className="text-left px-4 py-2 font-medium">Módulos pro</th>
                <th className="text-left px-4 py-2 font-medium">Trial / Período</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialItems.map((store) => {
                const tier = (store.limits as Record<string, number>).max_products ?? '—'
                const proCount = PRO_MODULES.filter(
                  (m) => (store.modules as Record<string, boolean>)[m] === true,
                ).length

                return (
                  <tr key={store.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{store.name}</p>
                      <p className="text-xs text-muted-foreground">{store.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <BillingBadge status={store.billing_status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tier} prod.</td>
                    <td className="px-4 py-3">
                      {proCount > 0 ? (
                        <Badge variant="outline">{proCount} activos</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {store.billing_status === 'demo' && store.trial_ends_at
                        ? `Trial hasta ${new Date(store.trial_ends_at).toLocaleDateString('es-AR')}`
                        : store.current_period_end
                          ? `Período hasta ${new Date(store.current_period_end).toLocaleDateString('es-AR')}`
                          : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" render={<Link href={`/superadmin/stores/${store.id}`} />}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
