'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <div className="text-6xl font-bold text-red-600 mb-2">⚠️</div>
              <h1 className="text-2xl font-semibold text-[#1b1b1b] mb-2">Algo salió mal</h1>
              <p className="text-[#6e6e73] mb-4">
                Disculpanos, encontramos un error inesperado. Estamos trabajando para solucionarlo.
              </p>
              {process.env.NODE_ENV === 'development' && error.message && (
                <p className="text-xs text-[#999] font-mono bg-[#f5f5f5] p-3 rounded mb-4 break-words">
                  {error.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-[#1b1b1b] text-white text-sm font-semibold hover:bg-[#2a2a2a] transition-colors"
              >
                Reintentar
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center h-12 px-6 rounded-full border border-[#e0e0e0] text-[#1b1b1b] text-sm font-semibold hover:bg-[#f5f5f5] transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
