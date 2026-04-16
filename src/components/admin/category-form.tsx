'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCategorySchema, type CreateCategoryInput } from '@/lib/validations/category'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type CategoryFormProps = {
  defaultValues?: Partial<CreateCategoryInput & { id: string }>
  onSubmit: (data: CreateCategoryInput) => void
  isPending?: boolean
  submitLabel?: string
}

export function CategoryForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = 'Guardar',
}: CategoryFormProps) {
  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      is_active: defaultValues?.is_active ?? true,
    },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input id="cat-name" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cat-desc">Descripción</Label>
        <Textarea id="cat-desc" rows={2} {...form.register('description')} />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}
