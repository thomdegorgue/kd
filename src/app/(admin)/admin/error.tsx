'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Algo salió mal</h2>
        <p className="text-sm text-muted-foreground">Ocurrió un error inesperado en el panel de administración.</p>
      </div>
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre className="text-xs text-left bg-muted p-3 rounded-md max-w-lg w-full overflow-auto whitespace-pre-wrap">
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ''}
        </pre>
      )}
      <Button onClick={reset} variant="outline" size="sm">Reintentar</Button>
    </div>
  )
}
