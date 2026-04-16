'use client'

import { cn } from '@/lib/utils'
import type { Category } from '@/lib/types'

interface CategoryFilterProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (categoryId: string | null) => void
}

export function CategoryFilter({ categories, selectedId, onSelect }: CategoryFilterProps) {
  if (categories.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors',
          selectedId === null
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background hover:bg-muted',
        )}
      >
        Todos
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors',
            selectedId === cat.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:bg-muted',
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
