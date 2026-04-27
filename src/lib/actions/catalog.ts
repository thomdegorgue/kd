'use server'

import { listProductsPublic } from '@/lib/db/queries/products'
import type { Product } from '@/lib/types'

export async function loadMoreCategoryProducts(
  storeId: string,
  categoryId: string,
  page: number,
): Promise<{ products: Product[]; total: number }> {
  return listProductsPublic(storeId, { categoryId, page })
}
