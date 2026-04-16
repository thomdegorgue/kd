'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateStoreSchema, type UpdateStoreInput } from '@/lib/validations/store'
import { useStoreConfig, useUpdateStore } from '@/lib/hooks/use-store-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageUploader } from '@/components/shared/image-uploader'
import { useAdminContext } from '@/lib/hooks/use-admin-context'

export function StoreSettingsForm() {
  const { data: store, isLoading } = useStoreConfig()
  const { store_id } = useAdminContext()
  const updateMutation = useUpdateStore()

  const form = useForm<UpdateStoreInput>({
    resolver: zodResolver(updateStoreSchema),
    values: store
      ? {
          name: store.name,
          description: store.description ?? undefined,
          whatsapp: store.whatsapp ?? undefined,
          logo_url: store.logo_url ?? undefined,
          cover_url: store.cover_url ?? undefined,
        }
      : undefined,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  const onSubmit = form.handleSubmit((data) => {
    updateMutation.mutate(data)
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la tienda</Label>
        <Input id="name" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" rows={3} {...form.register('description')} />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp (sin +, solo números)</Label>
        <Input id="whatsapp" placeholder="5491123456789" {...form.register('whatsapp')} />
        {form.formState.errors.whatsapp && (
          <p className="text-sm text-destructive">{form.formState.errors.whatsapp.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <ImageUploader
          storeId={store_id}
          folder="logos"
          maxFiles={1}
          existingUrls={form.watch('logo_url') ? [form.watch('logo_url')!] : []}
          onUpload={(urls) => form.setValue('logo_url', urls[0] ?? undefined, { shouldDirty: true })}
        />
      </div>

      <div className="space-y-2">
        <Label>Portada</Label>
        <ImageUploader
          storeId={store_id}
          folder="covers"
          maxFiles={1}
          existingUrls={form.watch('cover_url') ? [form.watch('cover_url')!] : []}
          onUpload={(urls) => form.setValue('cover_url', urls[0] ?? undefined, { shouldDirty: true })}
        />
      </div>

      <Button type="submit" disabled={updateMutation.isPending || !form.formState.isDirty}>
        {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
