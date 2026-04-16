'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProducts } from '@/lib/hooks/use-products'
import { useCreateOrder } from '@/lib/hooks/use-orders'
import { useCurrency } from '@/lib/hooks/use-currency'

const orderFormSchema = z.object({
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    product_name: z.string(),
    quantity: z.number().int().min(1),
    unit_price: z.number().int().min(0),
  })).min(1, 'Agregá al menos un producto'),
})

type OrderFormValues = z.infer<typeof orderFormSchema>

export default function NewOrderPage() {
  const router = useRouter()
  const createMutation = useCreateOrder()
  const { data: productsData } = useProducts({ pageSize: 200 })
  const { formatPrice } = useCurrency()
  const [productSearch, setProductSearch] = useState('')

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      notes: '',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const products = (productsData?.items ?? []) as unknown as {
    id: string
    name: string
    price: number
    is_active: boolean
  }[]

  const filteredProducts = products
    .filter((p) => p.is_active)
    .filter((p) =>
      !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
    )
    .slice(0, 10)

  const items = form.watch('items')
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  function addProduct(product: { id: string; name: string; price: number }) {
    const existing = items.findIndex((i) => i.product_id === product.id)
    if (existing >= 0) {
      form.setValue(`items.${existing}.quantity`, items[existing].quantity + 1)
    } else {
      append({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
      })
    }
    setProductSearch('')
  }

  const onSubmit = form.handleSubmit((data) => {
    const customer = data.customer_name
      ? {
          name: data.customer_name,
          phone: data.customer_phone || undefined,
          email: data.customer_email || undefined,
        }
      : undefined

    createMutation.mutate(
      {
        items: data.items.map((item) => ({
          ...item,
          variant_id: undefined,
        })),
        customer,
        notes: data.notes || undefined,
        total,
      },
      { onSuccess: () => router.push('/admin/orders') }
    )
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Nuevo pedido</h2>
        <p className="text-sm text-muted-foreground">Registrá un pedido manualmente.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
        {/* Product search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {productSearch && filteredProducts.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted text-left"
                    onClick={() => addProduct(p)}
                  >
                    <span>{p.name}</span>
                    <span className="text-muted-foreground tabular-nums">{formatPrice(p.price)}</span>
                  </button>
                ))}
              </div>
            )}

            {fields.length > 0 && (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">{field.product_name}</span>
                    <Input
                      type="number"
                      min={1}
                      className="w-16 text-center"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                    <span className="text-muted-foreground tabular-nums w-20 text-right">
                      {formatPrice(items[index]?.unit_price * (items[index]?.quantity ?? 1))}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{formatPrice(total)}</span>
                </div>
              </div>
            )}

            {form.formState.errors.items && (
              <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cliente (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="customer_name" className="text-xs">Nombre</Label>
                <Input id="customer_name" {...form.register('customer_name')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="customer_phone" className="text-xs">Teléfono</Label>
                <Input id="customer_phone" {...form.register('customer_phone')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" rows={2} {...form.register('notes')} />
        </div>

        <Button type="submit" disabled={createMutation.isPending || fields.length === 0}>
          {createMutation.isPending ? 'Creando...' : 'Crear pedido'}
        </Button>
      </form>
    </div>
  )
}
