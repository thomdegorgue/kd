'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Phone, Mail, ChevronRight, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useCustomers, useCustomer } from '@/lib/hooks/use-customers'
import { useDebounce } from '@/lib/hooks/use-debounce'

type CustomerShape = {
  id: string
  name: string
  phone: string | null
  email: string | null
  created_at: string
  total_orders?: number
  total_spent?: number
}

function CustomerAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-primary">{initial}</span>
    </div>
  )
}

function CustomerDetailSheet({
  customerId,
  onClose,
}: {
  customerId: string
  onClose: () => void
}) {
  const { data: customer, isLoading } = useCustomer(customerId)

  const c = customer as unknown as CustomerShape | undefined

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-3">
            {c && <CustomerAvatar name={c.name} />}
            <span>{c?.name ?? 'Cargando...'}</span>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : c ? (
          <Tabs defaultValue="datos" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-5 mt-4 w-auto justify-start shrink-0">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="datos" className="flex-1 overflow-y-auto px-5 pb-5 mt-4 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="text-sm font-medium">{c.phone ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{c.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente desde</p>
                    <p className="text-sm font-medium">
                      {new Date(c.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href={`/admin/customers/${c.id}`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium">Ver perfil completo</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </TabsContent>

            <TabsContent value="pedidos" className="flex-1 overflow-y-auto px-5 pb-5 mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Historial de pedidos próximamente.
              </p>
            </TabsContent>

            <TabsContent value="notas" className="flex-1 overflow-y-auto px-5 pb-5 mt-4">
              <p className="text-sm text-muted-foreground text-center py-8">
                Notas del cliente próximamente.
              </p>
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export default function CustomersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading } = useCustomers({
    page,
    pageSize: 50,
    search: debouncedSearch || undefined,
  })

  const customers = (data?.items ?? []) as unknown as CustomerShape[]
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  function openCustomer(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('id', id)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  function closeCustomer() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('id')
    router.replace(`?${params.toString()}`, { scroll: false })
  }

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
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="Sin clientes"
            description={search ? 'No se encontraron clientes con ese criterio.' : 'Todavía no tenés clientes registrados.'}
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
              {customers.map((c) => (
                <button
                  key={c.id}
                  className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/30 transition-colors"
                  onClick={() => openCustomer(c.id)}
                >
                  <CustomerAvatar name={c.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </span>
                      )}
                      {!c.phone && c.email && (
                        <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs hidden xs:flex">
                      {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: tabla */}
            <div className="hidden sm:block border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow
                      key={c.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => openCustomer(c.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CustomerAvatar name={c.name} />
                          <span className="font-medium text-sm">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.phone ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
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

      {/* Sheet de detalle */}
      {selectedId && (
        <CustomerDetailSheet customerId={selectedId} onClose={closeCustomer} />
      )}
    </div>
  )
}
