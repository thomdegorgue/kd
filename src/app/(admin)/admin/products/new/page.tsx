'use client'

import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/admin/product-form'
import { useCreateProduct } from '@/lib/hooks/use-products'

export default function NewProductPage() {
  const router = useRouter()
  const createMutation = useCreateProduct()

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Nuevo producto</h2>
        <p className="text-sm text-muted-foreground">Completá los datos del producto.</p>
      </div>
      <ProductForm
        submitLabel="Crear producto"
        isPending={createMutation.isPending}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => router.push('/admin/products'),
          })
        }}
      />
    </div>
  )
}
