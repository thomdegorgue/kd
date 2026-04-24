'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateStoreSchema, type UpdateStoreInput } from '@/lib/validations/store'
import { useStoreConfig, useUpdateStore, useUpdateStoreConfig } from '@/lib/hooks/use-store-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageUploader } from '@/components/shared/image-uploader'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import type { StoreConfig } from '@/lib/types'

const PRESET_COLORS = [
  '#1b1b1b', '#2563eb', '#7c3aed', '#db2777',
  '#dc2626', '#ea580c', '#16a34a', '#0891b2',
]

export function StoreSettingsForm() {
  const { data: store, isLoading } = useStoreConfig()
  const { store_id } = useAdminContext()
  const updateMutation = useUpdateStore()
  const updateConfigMutation = useUpdateStoreConfig()

  const storeConfig = store?.config as StoreConfig | null
  const [selectedColor, setSelectedColor] = useState(storeConfig?.primary_color ?? '#1b1b1b')

  useEffect(() => {
    if (storeConfig?.primary_color) {
      setSelectedColor(storeConfig.primary_color)
    }
  }, [storeConfig?.primary_color])

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

  const onSaveColor = () => {
    updateConfigMutation.mutate({ primary_color: selectedColor })
  }

  return (
    <div className="space-y-8 max-w-lg">
      <form onSubmit={onSubmit} className="space-y-6">
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
          <Label htmlFor="whatsapp">WhatsApp (con código de país, sin +)</Label>
          <Input id="whatsapp" placeholder="5491155555555" {...form.register('whatsapp')} />
          <p className="text-xs text-muted-foreground">Ejemplo: 5491155555555 (54 = Argentina, sin espacios ni guiones)</p>
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

      <div className="space-y-3 border-t pt-6">
        <Label>Color principal de tu marca</Label>
        <p className="text-xs text-muted-foreground">Se aplica en el header y elementos destacados de tu catálogo.</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className="h-8 w-8 rounded-full border-2 transition-all"
              style={{
                backgroundColor: color,
                borderColor: selectedColor === color ? color : 'transparent',
                outline: selectedColor === color ? `2px solid ${color}` : 'none',
                outlineOffset: '2px',
              }}
              aria-label={`Color ${color}`}
            />
          ))}
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="h-8 w-8 rounded-full cursor-pointer border border-input"
            title="Color personalizado"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: selectedColor }} />
          <span className="text-xs font-mono text-muted-foreground">{selectedColor}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onSaveColor}
          disabled={updateConfigMutation.isPending || selectedColor === (storeConfig?.primary_color ?? '#1b1b1b')}
        >
          {updateConfigMutation.isPending ? 'Guardando...' : 'Guardar color'}
        </Button>
      </div>
    </div>
  )
}
