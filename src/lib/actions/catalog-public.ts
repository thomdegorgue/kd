'use server'

import { listProductsPublic } from '@/lib/db/queries/products'
import type { ProductsPage } from '@/lib/db/queries/products'

export async function loadMoreProducts(
  storeId: string,
  page: number,
  options?: { categoryId?: string; search?: string },
): Promise<ProductsPage> {
  return listProductsPublic(storeId, { ...options, page })
}
