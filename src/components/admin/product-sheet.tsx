'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, ExternalLink, ArrowRight } from 'lucide-react'
import { createProductSchema } from '@/lib/validations/product'
import type { UpdateProductPageInput } from '@/lib/validations/product'
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
import { useProduct, useCreateProduct, useUpdateProduct, useUpdateProductPage } from '@/lib/hooks/use-products'
import { useUnsavedChanges } from '@/lib/hooks/use-unsaved-changes'

// ── Form schema ──────────────────────────────────────────────

const formSchema = createProductSchema.extend({
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
})
type FormValues = z.infer<typeof formSchema>

// ── Page state ───────────────────────────────────────────────

type PageState = {
  active: boolean
  long_description: string
  specs: Array<{ key: string; value: string }>
  gallery_urls: string[]
}

function defaultPageState(): PageState {
  return { active: false, long_description: '', specs: [], gallery_urls: [] }
}

// ── Tabs ─────────────────────────────────────────────────────

type ProductSheetProps = {
  id?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductSheet({ id, open, onOpenChange }: ProductSheetProps) {
  const router = useRouter()
  const { store_id, modules } = useAdminContext()
  const { currency } = useCurrency()
  const { data: categories } = useCategories()
  const { data: product, isLoading } = useProduct(id ?? '')
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const updatePageMutation = useUpdateProductPage()

  // Dynamic tab list based on active modules
  const TABS = [
    'Ficha',
    'Categorías',
    ...(modules?.stock ? ['Stock'] : []),
    ...(modules?.product_page ? ['Página'] : []),
    ...(modules?.variants ? ['Variantes'] : []),
  ] as const
  type Tab = (typeof TABS)[number]

  const [tab, setTab] = useState<Tab>('Ficha')
  const [pageState, setPageState] = useState<PageState>(defaultPageState())

  // ── Main form ─────────────────────────────────────────────

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
      stock: null,
    },
  })

  useUnsavedChanges(form.formState.isDirty)

  // Reset on open/product change
  useEffect(() => {
    if (!open) {
      setTab('Ficha')
      setPageState(defaultPageState())
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
        stock: (product.stock as number | null | undefined) ?? null,
      })

      // Load page metadata
      const meta = (product.metadata as Record<string, unknown> | null) ?? {}
      const page = (meta.page as Partial<PageState> | undefined) ?? {}
      setPageState({
        active: (page.active as boolean | undefined) ?? false,
        long_description: (page.long_description as string | undefined) ?? '',
        specs: (page.specs as Array<{ key: string; value: string }> | undefined) ?? [],
        gallery_urls: (page.gallery_urls as string[] | undefined) ?? [],
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
        stock: null,
      })
      setPageState(defaultPageState())
    }
  }, [open, id, product, form])

  const selectedCategoryIds = form.watch('category_ids') ?? []

  function toggleCategory(catId: string) {
    const current = form.getValues('category_ids') ?? []
    const next = current.includes(catId) ? current.filter((c) => c !== catId) : [...current, catId]
    form.setValue('category_ids', next, { shouldDirty: true })
  }

  // ── Submit handlers ───────────────────────────────────────

  const handleSubmit = form.handleSubmit(async (data) => {
    const payload = {
      ...data,
      price: Math.round(data.price * 100),
      compare_price: data.compare_price ? Math.round(data.compare_price * 100) : null,
      stock: data.stock ?? null,
    }
    if (id) {
      await updateMutation.mutateAsync({ id, ...payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onOpenChange(false)
  })

  async function handleSavePage() {
    if (!id) return
    const input: UpdateProductPageInput = {
      product_id: id,
      active: pageState.active,
      long_description: pageState.long_description || undefined,
      specs: pageState.specs.filter((s) => s.key.trim()),
      gallery_urls: pageState.gallery_urls,
    }
    await updatePageMutation.mutateAsync(input)
  }

  function addSpec() {
    setPageState((s) => ({ ...s, specs: [...s.specs, { key: '', value: '' }] }))
  }

  function removeSpec(i: number) {
    setPageState((s) => ({ ...s, specs: s.specs.filter((_, j) => j !== i) }))
  }

  function updateSpec(i: number, field: 'key' | 'value', val: string) {
    setPageState((s) => {
      const specs = [...s.specs]
      specs[i] = { ...specs[i], [field]: val }
      return { ...s, specs }
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{id ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
          <div className="flex flex-wrap gap-1 mt-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t as Tab)}
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
          <>
            {/* ── Tabs Ficha + Categorías + Stock → use RHF form ── */}
            {(tab === 'Ficha' || tab === 'Categorías' || tab === 'Stock') && (
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                  {/* ── Tab: Ficha ── */}
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

                  {/* ── Tab: Categorías ── */}
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

                  {/* ── Tab: Stock ── */}
                  {tab === 'Stock' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="ps-stock">Unidades en stock</Label>
                        <Input
                          id="ps-stock"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Ingresá la cantidad disponible"
                          {...form.register('stock', { valueAsNumber: true })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Dejá vacío si no querés controlar el stock de este producto.
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground rounded-lg border bg-muted/30 px-3 py-2.5">
                        El stock se muestra en el catálogo como badge &quot;Sin stock&quot; o &quot;Quedan N&quot; cuando el módulo Stock está activo.
                      </p>
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

            {/* ── Tab: Página (product_page module) ── */}
            {tab === 'Página' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                  {!id ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Guardá el producto primero para configurar la página interna.
                    </p>
                  ) : (
                    <>
                      {/* Toggle active */}
                      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">Página interna activa</p>
                          <p className="text-xs text-muted-foreground">
                            Muestra &quot;Ver detalles&quot; en el catálogo y abre esta página.
                          </p>
                        </div>
                        <Switch
                          checked={pageState.active}
                          onCheckedChange={(v) => setPageState((s) => ({ ...s, active: v }))}
                        />
                      </div>

                      {pageState.active && (
                        <>
                          {/* Long description */}
                          <div className="space-y-1.5">
                            <Label htmlFor="ps-long-desc">Descripción larga</Label>
                            <Textarea
                              id="ps-long-desc"
                              rows={5}
                              placeholder="Detalles completos del producto, composición, cuidados..."
                              value={pageState.long_description}
                              onChange={(e) => setPageState((s) => ({ ...s, long_description: e.target.value }))}
                            />
                          </div>

                          {/* Specs */}
                          <div className="space-y-2">
                            <Label>Especificaciones</Label>
                            <div className="space-y-2">
                              {pageState.specs.map((spec, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <Input
                                    placeholder="Clave (ej: Material)"
                                    value={spec.key}
                                    onChange={(e) => updateSpec(i, 'key', e.target.value)}
                                    className="h-8 text-xs flex-1"
                                  />
                                  <Input
                                    placeholder="Valor (ej: Algodón 100%)"
                                    value={spec.value}
                                    onChange={(e) => updateSpec(i, 'value', e.target.value)}
                                    className="h-8 text-xs flex-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeSpec(i)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={addSpec}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Agregar fila
                              </button>
                            </div>
                          </div>

                          {/* Gallery */}
                          <div className="space-y-2">
                            <Label>Galería de imágenes <span className="text-muted-foreground font-normal">(hasta 10)</span></Label>
                            <ImageUploader
                              storeId={store_id}
                              folder="pages"
                              maxFiles={10}
                              existingUrls={pageState.gallery_urls}
                              onUpload={(urls) => setPageState((s) => ({ ...s, gallery_urls: urls }))}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {id && (
                  <div className="px-6 py-4 border-t shrink-0 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenChange(false)}
                      disabled={updatePageMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={handleSavePage}
                      disabled={updatePageMutation.isPending}
                    >
                      {updatePageMutation.isPending ? 'Guardando...' : 'Guardar página'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Variantes (variants module) ── */}
            {tab === 'Variantes' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {!id ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      Guardá el producto primero para configurar variantes.
                    </p>
                  ) : (
                    <div className="space-y-4 py-2">
                      <p className="text-sm text-muted-foreground">
                        Las variantes (talle, color, etc.) se gestionan en una página dedicada con control completo de combinaciones y stock por combo.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => {
                          onOpenChange(false)
                          router.push(`/admin/products/${id}/variants`)
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Gestionar variantes
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => onOpenChange(false)}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
