'use client'

import type { Dispatch, SetStateAction } from 'react'

/** Recorta la lista según página; devuelve totalPages y página efectiva (clamp). */
export function paginatedSlice<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.max(1, Math.min(page, totalPages))
  return {
    slice: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalPages,
    safePage,
  }
}

export type EntityListPaginationProps = {
  page: number
  totalPages: number
  setPage: Dispatch<SetStateAction<number>>
}

/** Misma UI que el historial de ventas: Anterior / Página n / m / Siguiente */
export function EntityListPagination({ page, totalPages, setPage }: EntityListPaginationProps) {
  const displayPage = Math.min(page, totalPages)
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <button
        type="button"
        className="font-medium text-foreground disabled:opacity-40"
        disabled={displayPage <= 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
      >
        Anterior
      </button>
      <span>
        Página {displayPage} / {totalPages}
      </span>
      <button
        type="button"
        className="font-medium text-foreground disabled:opacity-40"
        disabled={displayPage >= totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      >
        Siguiente
      </button>
    </div>
  )
}
