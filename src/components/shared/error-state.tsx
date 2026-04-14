import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  error?: Error | null
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  error,
  message = 'Algo salió mal. Intentá de nuevo.',
  onRetry,
  className,
}: ErrorStateProps) {
  const displayMessage = error?.message ?? message

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-16 text-center',
        className
      )}
    >
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Error</p>
        <p className="text-xs text-muted-foreground max-w-xs">{displayMessage}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
