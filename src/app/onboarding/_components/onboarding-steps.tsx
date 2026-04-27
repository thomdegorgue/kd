'use client'

const STEPS = ['Tu tienda', 'Diseño', 'Plan', '¡Listo!']

export function OnboardingSteps({ current }: { current: number }) {
  const percent = Math.round((current / (STEPS.length - 1)) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Paso {current + 1} de {STEPS.length}
        </span>
        <span className="font-medium text-foreground">{STEPS[current]}</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
