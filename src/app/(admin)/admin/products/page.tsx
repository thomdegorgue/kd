'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Trash2, Pencil } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useProducts, useDeleteProduct } from '@/lib/hooks/use-products'
import { useCurrency } from '@/lib/hooks/use-currency'
import { useDebounce } from '@/lib/hooks/use-debounce'

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading } = useProducts({
    page,
    pageSize: 50,
    search: debouncedSearch || undefined,
  })
  const deleteMutation = useDeleteProduct()
  const { formatPrice } = useCurrency()

  const products = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Productos</h2>
          <p className="text-sm text-muted-foreground">{total} productos</p>
        </div>
        <Link href="/admin/products/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {search ? 'No se encontraron productos.' : 'Aún no tenés productos.'}
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const p = product as { id: string; name: string; price: number; is_active: boolean; is_featured: boolean }
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                          {p.name}
                        </Link>
                        {p.is_featured && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">Destacado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPrice(p.price)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? 'default' : 'outline'}>
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' h-8 w-8'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              El producto se eliminará del catálogo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId)
                  setDeleteId(null)
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
