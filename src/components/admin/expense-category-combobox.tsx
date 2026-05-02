'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpenseCategoryComboboxProps {
  value: string
  onChange: (value: string) => void
  categories: string[]
  onAddCategory: (categories: string[]) => void
  disabled?: boolean
}

export function ExpenseCategoryCombobox({
  value,
  onChange,
  categories,
  onAddCategory,
  disabled = false,
}: ExpenseCategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)

  const handleSelect = (category: string) => {
    onChange(category)
    setOpen(false)
    setInput('')
  }

  const handleCreateNew = () => {
    if (input.trim() && !categories.includes(input.trim())) {
      const newCategories = [...categories, input.trim()]
      onAddCategory(newCategories)
      onChange(input.trim())
      setInput('')
      setCreatingNew(false)
      setOpen(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label>Categoría</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <button
            disabled={disabled}
            className="w-full h-8 px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent text-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
          >
            {value || 'Seleccionar categoría...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <div className="p-2 border-b">
              <Input
                placeholder="Buscar o crear..."
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setCreatingNew(false)
                }}
                className="h-8"
              />
            </div>
            <CommandEmpty>
              {input.trim() ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-xs h-7"
                  onClick={() => setCreatingNew(true)}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Crear: &quot;{input}&quot;
                </Button>
              ) : (
                'No hay categorías'
              )}
            </CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={() => handleSelect(category)}
                  className="text-xs h-7"
                >
                  <Check
                    className={cn('mr-2 h-3 w-3', value === category ? 'opacity-100' : 'opacity-0')}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
            {creatingNew && input.trim() && !categories.includes(input.trim()) && (
              <div className="border-t p-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={handleCreateNew}
                >
                  Crear &quot;{input}&quot;
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
