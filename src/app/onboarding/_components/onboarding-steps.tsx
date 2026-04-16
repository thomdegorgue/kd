'use client'

import { cn } from '@/lib/utils'

const STEPS = ['Tu tienda', 'Logo', 'Primer producto', '¡Listo!']

export function OnboardingSteps({ current }: { current: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                'h-1.5 w-full rounded-full transition-colors',
                i < current ? 'bg-primary' : i === current ? 'bg-primary' : 'bg-muted'
              )}
            />
            <span className={cn('text-xs', i === current ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Paso {current + 1} de {STEPS.length}
      </p>
    </div>
  )
}
