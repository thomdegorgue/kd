'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useCustomers } from '@/lib/hooks/use-customers'
import { useDebounce } from '@/lib/hooks/use-debounce'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading } = useCustomers({
    page,
    pageSize: 50,
    search: debouncedSearch || undefined,
  })

  const customers = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold leading-none">Clientes</h2>
            <p className="text-xs text-muted-foreground mt-1">{total} clientes</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar por nombre o teléfono..."
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          filterPreset="generic"
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {search ? 'No se encontraron clientes.' : 'Aún no tenés clientes.'}
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const c = customer as unknown as {
                    id: string
                    name: string
                    phone: string | null
                    email: string | null
                    created_at: string
                  }
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
