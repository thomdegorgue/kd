'use client'

import { useMemo, useState, useEffect } from 'react'
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
import { buildWhatsAppMessage } from '@/lib/utils/whatsapp'
import { MessageCircle } from 'lucide-react'
import { MiniCatalogPreview } from '@/components/admin/mini-catalog-preview'

const PRESET_COLORS = [
  '#1b1b1b', '#2563eb', '#7c3aed', '#db2777',
  '#dc2626', '#ea580c', '#16a34a', '#0891b2',
]

export function StoreSettingsForm() {
  const { data: store, isLoading } = useStoreConfig()
  const { store_id, modules } = useAdminContext()
  const updateMutation = useUpdateStore()
  const updateConfigMutation = useUpdateStoreConfig()

  const storeConfig = store?.config as StoreConfig | null
  const [selectedColor, setSelectedColor] = useState(storeConfig?.primary_color ?? '#1b1b1b')
  const [city, setCity] = useState((storeConfig?.city as string | undefined) ?? '')
  const [hours, setHours] = useState((storeConfig?.hours as string | undefined) ?? '')
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false)
  const [social, setSocial] = useState({
    instagram: (storeConfig?.social?.instagram ?? '') as string,
    facebook: (storeConfig?.social?.facebook ?? '') as string,
    tiktok: (storeConfig?.social?.tiktok ?? '') as string,
    twitter: (storeConfig?.social?.twitter ?? '') as string,
  })
  const [showSocialPreview, setShowSocialPreview] = useState(false)

  useEffect(() => {
    if (storeConfig?.primary_color) {
      setSelectedColor(storeConfig.primary_color)
    }
    if (storeConfig?.city) {
      setCity(storeConfig.city as string)
    }
    if (storeConfig?.hours) {
      setHours(storeConfig.hours as string)
    }
    if (storeConfig?.social) {
      setSocial({
        instagram: (storeConfig.social.instagram ?? '') as string,
        facebook: (storeConfig.social.facebook ?? '') as string,
        tiktok: (storeConfig.social.tiktok ?? '') as string,
        twitter: (storeConfig.social.twitter ?? '') as string,
      })
    }
  }, [storeConfig?.primary_color, storeConfig?.city, storeConfig?.hours, storeConfig?.social])

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

  const whatsappPreview = useMemo(() => {
    const storeWhatsapp = form.getValues('whatsapp') ?? store?.whatsapp ?? ''
    return buildWhatsAppMessage({
      storeConfig: { name: store?.name ?? 'Tu tienda', whatsapp: storeWhatsapp },
      items: [
        { name: 'Producto de ejemplo', quantity: 2, unit_price: 12500 },
        { name: 'Otro producto', quantity: 1, unit_price: 8900, variant_label: 'Color: Negro · Talle: M' },
      ],
      customerName: 'María',
      deliveryType: 'pickup',
      customerNotes: 'Si puede ser, sin cambios. Gracias.',
    }).messageText
  }, [form, store?.name, store?.whatsapp])

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
        <h3 className="font-semibold">Apariencia</h3>
        <p className="text-xs text-muted-foreground">
          Vista previa del header del catálogo con tus datos actuales.
        </p>
        <MiniCatalogPreview
          name={form.watch('name') ?? store?.name ?? 'Tu tienda'}
          description={form.watch('description') ?? store?.description ?? null}
          coverUrl={form.watch('cover_url') ?? store?.cover_url ?? null}
          city={city || null}
          hours={hours || null}
          config={{
            ...(storeConfig ?? {}),
            primary_color: selectedColor,
          }}
        />
      </div>

      <div className="space-y-6 border-t pt-6">
        <div>
          <h3 className="font-semibold mb-4">Información de ubicación y horarios</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad/Localidad</Label>
              <Input
                id="city"
                placeholder="Ej: Buenos Aires"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Horarios de atención</Label>
              <Input
                id="hours"
                placeholder="Ej: Lun–Sáb 9–18hs"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => updateConfigMutation.mutate({ city: city || null, hours: hours || null })}
              disabled={updateConfigMutation.isPending || (city === (storeConfig?.city as string | undefined || '') && hours === (storeConfig?.hours as string | undefined || ''))}
            >
              {updateConfigMutation.isPending ? 'Guardando...' : 'Guardar ubicación y horarios'}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">WhatsApp</h3>
            <p className="text-xs text-muted-foreground">
              Vista previa del mensaje que va a recibir el cliente cuando haga el pedido.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowWhatsAppPreview((v) => !v)}>
            {showWhatsAppPreview ? 'Ocultar' : 'Ver preview'}
          </Button>
        </div>

        {showWhatsAppPreview && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-green-600" />
              Mensaje de ejemplo
            </div>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 text-xs text-muted-foreground leading-relaxed border">
{whatsappPreview}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              Este preview es un ejemplo. El mensaje real incluye los productos del carrito y la nota del cliente.
            </p>
          </div>
        )}
      </div>

      {modules.social && (
        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Redes sociales</h3>
              <p className="text-xs text-muted-foreground">
                Se muestran en el footer de tu catálogo.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowSocialPreview((v) => !v)}>
              {showSocialPreview ? 'Ocultar' : 'Ver preview'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="social-instagram" className="text-xs">Instagram (usuario)</Label>
              <Input
                id="social-instagram"
                placeholder="mitienda"
                value={social.instagram}
                onChange={(e) => setSocial((s) => ({ ...s, instagram: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social-tiktok" className="text-xs">TikTok (usuario)</Label>
              <Input
                id="social-tiktok"
                placeholder="mitienda"
                value={social.tiktok}
                onChange={(e) => setSocial((s) => ({ ...s, tiktok: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social-facebook" className="text-xs">Facebook (URL)</Label>
              <Input
                id="social-facebook"
                placeholder="https://facebook.com/..."
                value={social.facebook}
                onChange={(e) => setSocial((s) => ({ ...s, facebook: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="social-twitter" className="text-xs">X/Twitter (usuario)</Label>
              <Input
                id="social-twitter"
                placeholder="mitienda"
                value={social.twitter}
                onChange={(e) => setSocial((s) => ({ ...s, twitter: e.target.value }))}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              updateConfigMutation.mutate({
                social: {
                  instagram: social.instagram.trim() || undefined,
                  facebook: social.facebook.trim() || undefined,
                  tiktok: social.tiktok.trim() || undefined,
                  twitter: social.twitter.trim() || undefined,
                },
              })
            }
            disabled={updateConfigMutation.isPending}
          >
            {updateConfigMutation.isPending ? 'Guardando...' : 'Guardar redes'}
          </Button>

          {showSocialPreview && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">Preview footer</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {social.instagram.trim() && <span>Instagram</span>}
                {social.facebook.trim() && <span>Facebook</span>}
                {social.tiktok.trim() && <span>TikTok</span>}
                {social.twitter.trim() && <span>X</span>}
                {!social.instagram.trim() &&
                  !social.facebook.trim() &&
                  !social.tiktok.trim() &&
                  !social.twitter.trim() && <span>Sin redes configuradas</span>}
              </div>
            </div>
          )}
        </div>
      )}

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
