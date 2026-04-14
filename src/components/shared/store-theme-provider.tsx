'use client'

import { useMemo, type CSSProperties } from 'react'

/**
 * Wraps children with store-level CSS variables.
 * KitDigital base tokens live in :root — these per-store tokens
 * override them for the scoped subtree (both vitrina and admin panel).
 */
interface StoreThemeProviderProps {
  primaryColor: string
  secondaryColor: string
  children: React.ReactNode
  className?: string
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

/** Decide si el texto encima de un color debe ser blanco o negro */
function getForeground(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1b1b1b' : '#ffffff'
}

export function StoreThemeProvider({
  primaryColor,
  secondaryColor,
  children,
  className,
}: StoreThemeProviderProps) {
  const style = useMemo((): CSSProperties => {
    const primaryFg = getForeground(primaryColor)
    const secondaryFg = getForeground(secondaryColor)

    return {
      '--store-primary': primaryColor,
      '--store-primary-fg': primaryFg,
      '--store-secondary': secondaryColor,
      '--store-secondary-fg': secondaryFg,
      // Override shadcn tokens so all components pick up store colors
      '--primary': primaryColor,
      '--primary-foreground': primaryFg,
      '--secondary': secondaryColor,
      '--secondary-foreground': secondaryFg,
      '--ring': primaryColor,
    } as CSSProperties
  }, [primaryColor, secondaryColor])

  return (
    <div style={style} className={className}>
      {children}
    </div>
  )
}
