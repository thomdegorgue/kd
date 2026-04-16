'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { z } from 'zod'
import {
  useVariantAttributes,
  useCreateVariantAttribute,
  useVariants,
  useDeleteVariant,
} from '@/lib/hooks/use-variants'
import { useCurrency } from '@/lib/hooks/use-currency'
import { useProduct } from '@/lib/hooks/use-products'

const attrFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(50),
})
type AttrFormInput = z.infer<typeof attrFormSchema>

export default function VariantsPage() {
  const params = useParams<{ id: string }>()
  const productId = params.id

  const { data: product } = useProduct(productId)
  const { data: attributes = [], isLoading: attrsLoading } = useVariantAttributes(productId)
  const { data: variants = [], isLoading: variantsLoading } = useVariants(productId)
  const createAttrMutation = useCreateVariantAttribute()
  const deleteVariantMutation = useDeleteVariant(productId)
  const { formatPrice } = useCurrency()

  const [showNewAttr, setShowNewAttr] = useState(false)
  const [valuesInput, setValuesInput] = useState('')

  const attrForm = useForm<AttrFormInput>({
    resolver: zodResolver(attrFormSchema),
  })

  async function onSubmitAttr(data: AttrFormInput) {
    const values = valuesInput.split(',').map((v: string) => v.trim()).filter(Boolean)
    if (values.length === 0) return

    await createAttrMutation.mutateAsync({
      product_id: productId,
      name: data.name,
      values,
    })

    attrForm.reset()
    setValuesInput('')
    setShowNewAttr(false)
  }

  const productName = (product as unknown as { name?: string })?.name ?? `Producto #${productId.slice(0, 8)}`

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/products/${productId}`}
          className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' h-8 w-8'}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold">Variantes</h2>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </div>
      </div>

      {/* Attributes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Atributos</h3>
          <Button size="sm" variant="outline" onClick={() => setShowNewAttr(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Atributo
          </Button>
        </div>

        {attrsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (attributes as Record<string, unknown>[]).length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay atributos. Creá uno para empezar.</p>
        ) : (
          <div className="space-y-2">
            {(attributes as Record<string, unknown>[]).map((attr) => (
              <Card key={attr.id as string}>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">{attr.name as string}</CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="flex gap-1 flex-wrap">
                    {((attr.values as Record<string, unknown>[]) ?? []).map((v) => (
                      <Badge key={v.id as string} variant="secondary">
                        {v.value as string}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Variants */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Variantes ({(variants as Record<string, unknown>[]).length})
        </h3>

        {variantsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (variants as Record<string, unknown>[]).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay variantes. Las variantes se crean a partir de los atributos.
          </p>
        ) : (
          <div className="border rounded-lg divide-y">
            {(variants as Record<string, unknown>[]).map((v) => (
              <div key={v.id as string} className="flex items-center gap-3 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{(v.label as string) ?? 'Variante'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {v.sku != null && <span className="text-xs text-muted-foreground font-mono">SKU: {v.sku as string}</span>}
                    {v.price_override != null && (
                      <span className="text-xs text-muted-foreground">
                        Precio: {formatPrice(v.price_override as number)}
                      </span>
                    )}
                    <Badge variant={(v.is_active as boolean) ? 'secondary' : 'outline'} className="text-xs">
                      {(v.is_active as boolean) ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={deleteVariantMutation.isPending}
                  onClick={() => deleteVariantMutation.mutate(v.id as string)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New attribute dialog */}
      <Dialog open={showNewAttr} onOpenChange={setShowNewAttr}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo atributo</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={attrForm.handleSubmit(onSubmitAttr)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="attr_name">Nombre del atributo</Label>
              <Input
                id="attr_name"
                placeholder="Ej: Talle, Color"
                {...attrForm.register('name')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="attr_values">Valores (separados por coma)</Label>
              <Input
                id="attr_values"
                placeholder="Ej: S, M, L, XL"
                value={valuesInput}
                onChange={(e) => setValuesInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Ej: Rojo, Verde, Azul</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewAttr(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAttrMutation.isPending}>
                {createAttrMutation.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
