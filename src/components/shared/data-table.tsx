'use client'

import { useState } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface ServerPagination {
  page: number
  pageSize: number
  total: number
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageSize?: number
  /** Server-side pagination. Cuando está presente, desactiva client-side sort/filter/pagination. */
  pagination?: ServerPagination
  onPageChange?: (page: number) => void
  onSort?: (sorting: SortingState) => void
  /** Muestra skeleton rows mientras carga */
  isLoading?: boolean
  /** Componente a mostrar cuando no hay datos */
  emptyState?: React.ReactNode
  /** Callback para exportar. Si se pasa, muestra botón de export. */
  onExport?: () => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Buscar...',
  pageSize = 20,
  pagination,
  onPageChange,
  onSort,
  isLoading,
  emptyState,
  onExport,
}: DataTableProps<TData, TValue>) {
  const isServerSide = !!pagination
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater
    setSorting(newSorting)
    if (isServerSide && onSort) {
      onSort(newSorting)
    }
  }

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(!isServerSide && {
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
    }),
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    ...(isServerSide && { pageCount: Math.ceil(pagination.total / pagination.pageSize) }),
    initialState: { pagination: { pageSize: isServerSide ? pagination.pageSize : pageSize } },
    state: {
      sorting,
      columnFilters,
      ...(isServerSide && { pagination: { pageIndex: pagination.page - 1, pageSize: pagination.pageSize } }),
    },
  })

  const totalRows = isServerSide ? pagination.total : table.getFilteredRowModel().rows.length
  const currentPage = isServerSide ? pagination.page : table.getState().pagination.pageIndex + 1
  const totalPages = isServerSide
    ? Math.ceil(pagination.total / pagination.pageSize)
    : table.getPageCount()

  return (
    <div className="space-y-4">
      {/* Toolbar: search + export */}
      {(searchKey || onExport) && (
        <div className="flex items-center justify-between gap-4">
          {searchKey ? (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
              className="max-w-sm"
            />
          ) : (
            <div />
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          className={cn(
                            'flex items-center gap-1',
                            header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-muted-foreground">
                              {sorted === 'asc' ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : sorted === 'desc' ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3" />
                              )}
                            </span>
                          )}
                        </button>
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={`skeleton-${i}-${j}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyState ?? (
                    <span className="text-muted-foreground">Sin resultados.</span>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalRows} resultado(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (isServerSide && onPageChange) {
                onPageChange(currentPage - 1)
              } else {
                table.previousPage()
              }
            }}
            disabled={isServerSide ? currentPage <= 1 : !table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (isServerSide && onPageChange) {
                onPageChange(currentPage + 1)
              } else {
                table.nextPage()
              }
            }}
            disabled={isServerSide ? currentPage >= totalPages : !table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
