'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Trash2, Pencil, Star, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
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
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { EmptyState } from '@/components/shared/empty-state'
import dynamic from 'next/dynamic'

const ProductSheet = dynamic(
  () => import('@/components/admin/product-sheet').then((m) => ({ default: m.ProductSheet })),
  { ssr: false },
)
import { useProducts, useDeleteProduct } from '@/lib/hooks/use-products'
import { useCategories } from '@/lib/hooks/use-categories'
import { useCurrency } from '@/lib/hooks/use-currency'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { useRouter, useSearchParams } from 'next/navigation'

type ProductShape = {
  id: string
  name: string
  price: number
  compare_price?: number | null
  stock?: number | null
  image_url?: string | null
  is_active: boolean
  is_featured: boolean
  category_ids?: string[]
}

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const { modules } = useAdminContext()
  const stockModuleActive = modules?.stock === true

  const { data: categoriesData } = useCategories()
  const categories = (categoriesData ?? []).map((c) => ({ id: c.id as string, label: c.name as string }))
  const categoryNameById = new Map((categoriesData ?? []).map((c) => [c.id as string, c.name as string]))

  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading } = useProducts({
    page,
    pageSize: 50,
    search: debouncedSearch || undefined,
  })
  const deleteMutation = useDeleteProduct()
  const { formatPrice } = useCurrency()

  const products = (data?.items ?? []) as ProductShape[]
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([id]) => id)
  const hasSelection = selectedIds.length > 0

  const urlNew = searchParams.get('new')
  const urlEdit = searchParams.get('edit')

  const requestedSheetOpen = Boolean(urlEdit) || urlNew === '1'
  const requestedEditingId = urlEdit ?? undefined

  function openCreate() {
    setEditingId(undefined)
    setSheetOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setSheetOpen(true)
  }

  function toggleOne(id: string, value: boolean) {
    setSelected((prev) => ({ ...prev, [id]: value }))
  }

  function toggleAllOnPage(value: boolean) {
    setSelected((prev) => {
      const next = { ...prev }
      for (const p of products) next[p.id] = value
      return next
    })
  }

  const allOnPageIds = products.map((p) => p.id)
  const selectedOnPageCount = allOnPageIds.filter((id) => selected[id]).length
  const allSelectedOnPage = allOnPageIds.length > 0 && selectedOnPageCount === allOnPageIds.length

  function getStockBadgeMobile(p: ProductShape) {
    if (!stockModuleActive || p.stock === null || p.stock === undefined) return null
    if (p.stock === 0) return <Badge variant="destructive" className="text-[10px]">Sin stock</Badge>
    if (p.stock <= 5) return <Badge variant="secondary" className="text-[10px]">Bajo ({p.stock})</Badge>
    return <Badge variant="outline" className="text-[10px]">OK ({p.stock})</Badge>
  }

  function getStockBadgeDesktop(p: ProductShape) {
    if (!stockModuleActive) return <span className="text-xs text-muted-foreground">—</span>
    if (p.stock === null || p.stock === undefined) return <span className="text-xs text-muted-foreground">—</span>
    if (p.stock === 0) return <Badge variant="destructive">Sin stock</Badge>
    if (p.stock <= 5) return <Badge variant="secondary">Bajo ({p.stock})</Badge>
    return <Badge variant="outline">OK ({p.stock})</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Productos</h2>
              <p className="text-xs text-muted-foreground mt-1">{total} productos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasSelection && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:border-destructive/40"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar {selectedIds.length}
              </Button>
            )}
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar productos..."
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); setSelected({}) }}
          filterPreset="productos"
          categories={categories}
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title={search ? 'Sin resultados' : 'Todavía no cargaste productos'}
            description={search
              ? 'Probá con otro término de búsqueda.'
              : 'Creá tu primer producto para empezar a vender.'}
            action={!search ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear producto
              </Button>
            ) : undefined}
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden space-y-2">
              {products.map((p) => {
                const categoryBadges = (p.category_ids ?? [])
                  .map((id) => categoryNameById.get(id))
                  .filter(Boolean) as string[]

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => openEdit(p.id)}
                  >
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <Checkbox
                        checked={selected[p.id] === true}
                        onCheckedChange={(v) => toggleOne(p.id, v === true)}
                        aria-label={`Seleccionar ${p.name}`}
                      />
                    </div>
                    <div className="h-12 w-12 rounded-md bg-muted overflow-hidden relative shrink-0">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={p.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.is_featured && <Star className="h-3 w-3 text-amber-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-sm font-semibold tabular-nums">{formatPrice(p.price)}</span>
                        {p.compare_price ? (
                          <span className="text-xs text-muted-foreground line-through tabular-nums">
                            {formatPrice(p.compare_price)}
                          </span>
                        ) : null}
                        <Badge variant={p.is_active ? 'default' : 'outline'} className="text-[10px]">
                          {p.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {getStockBadgeMobile(p)}
                      </div>
                      {categoryBadges.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {categoryBadges.slice(0, 2).map((c) => (
                            <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                          ))}
                          {categoryBadges.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{categoryBadges.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div
                      className="shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(p.id)}
                        aria-label={`Eliminar ${p.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]">
                      <Checkbox
                        checked={allSelectedOnPage}
                        onCheckedChange={(v) => toggleAllOnPage(v === true)}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="hidden md:table-cell">Stock</TableHead>
                    <TableHead className="hidden lg:table-cell">Categorías</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const categoryBadges = (p.category_ids ?? [])
                      .map((id) => categoryNameById.get(id))
                      .filter(Boolean) as string[]

                    return (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => openEdit(p.id)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected[p.id] === true}
                            onCheckedChange={(v) => toggleOne(p.id, v === true)}
                            aria-label={`Seleccionar ${p.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[260px]">
                            <div className="h-10 w-10 rounded-md bg-muted overflow-hidden relative shrink-0">
                              {p.image_url ? (
                                <Image
                                  src={p.image_url}
                                  alt={p.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                                  Sin foto
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-medium hover:underline truncate">{p.name}</span>
                                {p.is_featured && (
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Star className="h-3 w-3" />
                                    Destacado
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-0.5 flex gap-1.5 items-center flex-wrap md:hidden">
                                {getStockBadgeDesktop(p)}
                                {categoryBadges.slice(0, 2).map((c) => (
                                  <Badge key={c} variant="outline" className="text-[10px]">
                                    {c}
                                  </Badge>
                                ))}
                                {categoryBadges.length > 2 && (
                                  <span className="text-[10px] text-muted-foreground">+{categoryBadges.length - 2}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="flex flex-col items-end leading-tight">
                            <span className="font-medium">{formatPrice(p.price)}</span>
                            {p.compare_price ? (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(p.compare_price)}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getStockBadgeDesktop(p)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1.5 max-w-[360px]">
                            {categoryBadges.slice(0, 3).map((c) => (
                              <Badge key={c} variant="outline" className="text-[10px]">
                                {c}
                              </Badge>
                            ))}
                            {categoryBadges.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{categoryBadges.length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.is_active ? 'default' : 'outline'}>
                            {p.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); openEdit(p.id) }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteId(p.id) }}
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
              <div className="flex items-center justify-center gap-2 pt-4">
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
      </div>

      <ProductSheet
        id={requestedSheetOpen ? requestedEditingId : editingId}
        open={requestedSheetOpen ? true : sheetOpen}
        onOpenChange={(open) => {
          if (!requestedSheetOpen) setSheetOpen(open)
          if (!open) {
            const sp = new URLSearchParams(searchParams.toString())
            sp.delete('new')
            sp.delete('edit')
            const qs = sp.toString()
            router.replace(qs ? `/admin/products?${qs}` : '/admin/products')
          }
        }}
      />

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

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedIds.length} productos</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán del catálogo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setBulkDeleteOpen(false)
                for (const id of selectedIds) {
                  await deleteMutation.mutateAsync(id)
                }
                setSelected({})
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
