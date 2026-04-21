'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['Tu tienda', 'Logo', 'Producto', '¡Listo!']

export function OnboardingSteps({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !done && !active && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                'text-[10px] leading-tight text-center w-14 hidden sm:block',
                active ? 'text-foreground font-medium' : done ? 'text-muted-foreground' : 'text-muted-foreground/60'
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-px mx-2 transition-colors',
                i < current ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
