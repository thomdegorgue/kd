'use client'

import { useStore } from '@/components/public/store-context'
import type { Category } from '@/lib/types'

interface CategoryFilterProps {
  categories: Category[]
  selectedId: string | null
  onSelect: (categoryId: string | null) => void
  productCounts?: Record<string, number>
  totalCount?: number
}

export function CategoryFilter({
  categories,
  selectedId,
  onSelect,
  productCounts,
  totalCount,
}: CategoryFilterProps) {
  const store = useStore()
  const brand = store.config?.primary_color ?? '#0f0f0f'
  const brandSoft = store.config?.secondary_color ?? '#ffffff'

  if (categories.length === 0) return null

  const items: Array<{ id: string | null; label: string; count: number | null }> = [
    { id: null, label: 'Todo', count: totalCount ?? null },
    ...categories.map((c) => ({
      id: c.id,
      label: c.name,
      count: productCounts?.[c.id] ?? null,
    })),
  ]

  return (
    <div className="flex gap-2 overflow-x-auto py-1 -mx-4 px-4 scrollbar-none">
      {items.map((item) => {
        const active = selectedId === item.id
        return (
          <button
            key={item.id ?? 'all'}
            type="button"
            onClick={() => onSelect(item.id)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0"
            style={
              active
                ? { background: brand, color: '#fff', border: `1px solid ${brand}` }
                : {
                    background: brandSoft,
                    color: brand,
                    border: `1px solid ${brand}20`,
                  }
            }
          >
            {item.label}
            {item.count !== null && (
              <span className="ml-1 opacity-60">({item.count})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
