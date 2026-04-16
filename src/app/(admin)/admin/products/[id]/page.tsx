'use client'

import { useParams, useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductForm } from '@/components/admin/product-form'
import { useProduct, useUpdateProduct } from '@/lib/hooks/use-products'

export default function EditProductPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: product, isLoading } = useProduct(params.id)
  const updateMutation = useUpdateProduct()

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-20 w-full max-w-lg" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Producto no encontrado.</p>
      </div>
    )
  }

  const p = product as unknown as {
    id: string
    name: string
    price: number
    description: string | null
    image_url: string | null
    is_active: boolean
    is_featured: boolean
    category_ids: string[]
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Editar producto</h2>
        <p className="text-sm text-muted-foreground">{p.name}</p>
      </div>
      <ProductForm
        defaultValues={{
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description ?? '',
          image_url: p.image_url ?? undefined,
          is_active: p.is_active,
          is_featured: p.is_featured,
        }}
        submitLabel="Guardar cambios"
        isPending={updateMutation.isPending}
        onSubmit={(data) => {
          updateMutation.mutate(
            { id: p.id, ...data },
            { onSuccess: () => router.push('/admin/products') }
          )
        }}
      />
    </div>
  )
}
