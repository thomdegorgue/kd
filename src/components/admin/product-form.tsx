'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createProductSchema } from '@/lib/validations/product'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ImageUploader } from '@/components/shared/image-uploader'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { useCurrency } from '@/lib/hooks/use-currency'

// Form schema — price in "pesos" (decimals), converts to cents on submit
const formSchema = createProductSchema.extend({
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
})

type FormValues = z.infer<typeof formSchema>

type ProductFormProps = {
  defaultValues?: Partial<FormValues & { id: string; image_url: string | null }>
  onSubmit: (data: FormValues) => void
  isPending?: boolean
  submitLabel?: string
}

export function ProductForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = 'Guardar',
}: ProductFormProps) {
  const { store_id } = useAdminContext()
  const { currency } = useCurrency()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      price: defaultValues?.price != null ? defaultValues.price / 100 : 0,
      description: defaultValues?.description ?? '',
      image_url: defaultValues?.image_url ?? undefined,
      is_active: defaultValues?.is_active ?? true,
      is_featured: defaultValues?.is_featured ?? false,
    },
  })

  const handleSubmit = form.handleSubmit((data) => {
    // Convertir precio a centavos
    onSubmit({ ...data, price: Math.round(data.price * 100) })
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Precio ({currency})</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          {...form.register('price', { valueAsNumber: true })}
        />
        {form.formState.errors.price && (
          <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" rows={3} {...form.register('description')} />
      </div>

      <div className="space-y-2">
        <Label>Imagen</Label>
        <ImageUploader
          storeId={store_id}
          folder="products"
          maxFiles={1}
          existingUrls={form.watch('image_url') ? [form.watch('image_url')!] : []}
          onUpload={(urls) => form.setValue('image_url', urls[0] ?? undefined, { shouldDirty: true })}
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={form.watch('is_active') ?? true}
            onCheckedChange={(v) => form.setValue('is_active', v, { shouldDirty: true })}
          />
          <Label htmlFor="is_active" className="text-sm">Activo</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="is_featured"
            checked={form.watch('is_featured') ?? false}
            onCheckedChange={(v) => form.setValue('is_featured', v, { shouldDirty: true })}
          />
          <Label htmlFor="is_featured" className="text-sm">Destacado</Label>
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}
