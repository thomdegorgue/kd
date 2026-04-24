'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createProductSchema } from '@/lib/validations/product'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageUploader } from '@/components/shared/image-uploader'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { useCurrency } from '@/lib/hooks/use-currency'
import { useCategories } from '@/lib/hooks/use-categories'
import { useProduct, useCreateProduct, useUpdateProduct } from '@/lib/hooks/use-products'

const TABS = ['Ficha', 'Categorías'] as const
type Tab = typeof TABS[number]

const formSchema = createProductSchema.extend({
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
})
type FormValues = z.infer<typeof formSchema>

type ProductSheetProps = {
  id?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductSheet({ id, open, onOpenChange }: ProductSheetProps) {
  const { store_id } = useAdminContext()
  const { currency } = useCurrency()
  const { data: categories } = useCategories()
  const { data: product, isLoading } = useProduct(id ?? '')
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const [tab, setTab] = useState<Tab>('Ficha')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      price: 0,
      compare_price: undefined,
      description: '',
      image_url: undefined,
      is_active: true,
      is_featured: false,
      category_ids: [],
    },
  })

  useEffect(() => {
    if (!open) {
      setTab('Ficha')
      return
    }
    if (id && product) {
      form.reset({
        name: product.name as string,
        price: (product.price as number) / 100,
        compare_price: (product.compare_price as number | undefined) ? (product.compare_price as number) / 100 : undefined,
        description: (product.description as string | undefined) ?? '',
        image_url: (product.image_url as string | undefined) ?? undefined,
        is_active: product.is_active as boolean,
        is_featured: product.is_featured as boolean,
        category_ids: product.category_ids ?? [],
      })
    } else if (!id) {
      form.reset({
        name: '',
        price: 0,
        compare_price: undefined,
        description: '',
        image_url: undefined,
        is_active: true,
        is_featured: false,
        category_ids: [],
      })
    }
  }, [open, id, product, form])

  const selectedCategoryIds = form.watch('category_ids') ?? []

  function toggleCategory(catId: string) {
    const current = form.getValues('category_ids') ?? []
    const next = current.includes(catId) ? current.filter((c) => c !== catId) : [...current, catId]
    form.setValue('category_ids', next, { shouldDirty: true })
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    const payload = {
      ...data,
      price: Math.round(data.price * 100),
      compare_price: data.compare_price ? Math.round(data.compare_price * 100) : undefined,
    }
    if (id) {
      await updateMutation.mutateAsync({ id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onOpenChange(false)
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{id ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
          <div className="flex gap-1 mt-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  tab === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </SheetHeader>

        {id && isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {tab === 'Ficha' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="ps-name">Nombre *</Label>
                    <Input id="ps-name" {...form.register('name')} />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ps-price">Precio ({currency}) *</Label>
                    <Input
                      id="ps-price"
                      type="number"
                      step="0.01"
                      min="0"
                      {...form.register('price', { valueAsNumber: true })}
                    />
                    {form.formState.errors.price && (
                      <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ps-compare-price">Precio anterior ({currency})</Label>
                    <Input
                      id="ps-compare-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Opcional — mostrar tachado en el catálogo"
                      {...form.register('compare_price', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ps-description">Descripción</Label>
                    <Textarea id="ps-description" rows={3} {...form.register('description')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Imagen</Label>
                    <ImageUploader
                      storeId={store_id}
                      folder="products"
                      maxFiles={1}
                      existingUrls={form.watch('image_url') ? [form.watch('image_url')!] : []}
                      onUpload={(urls) =>
                        form.setValue('image_url', urls[0] ?? undefined, { shouldDirty: true })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="ps-active"
                        checked={form.watch('is_active') ?? true}
                        onCheckedChange={(v) =>
                          form.setValue('is_active', v, { shouldDirty: true })
                        }
                      />
                      <Label htmlFor="ps-active" className="text-sm">Activo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="ps-featured"
                        checked={form.watch('is_featured') ?? false}
                        onCheckedChange={(v) =>
                          form.setValue('is_featured', v, { shouldDirty: true })
                        }
                      />
                      <Label htmlFor="ps-featured" className="text-sm">Destacado</Label>
                    </div>
                  </div>
                </>
              )}

              {tab === 'Categorías' && (
                <div className="space-y-1.5">
                  <Label>Categorías del producto</Label>
                  {!categories || categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No hay categorías creadas.
                    </p>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {categories.map((cat) => {
                        const catId = cat.id as string
                        const catName = cat.name as string
                        return (
                          <label
                            key={catId}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <Checkbox
                              checked={selectedCategoryIds.includes(catId)}
                              onCheckedChange={() => toggleCategory(catId)}
                            />
                            <span className="text-sm">{catName}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? 'Guardando...' : id ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
