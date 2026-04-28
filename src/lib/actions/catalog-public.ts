'use server'

import { getProductPublicDetail, listProductsPublic } from '@/lib/db/queries/products'
import type { ProductsPage, PublicProductDetail } from '@/lib/db/queries/products'

export async function loadMoreProducts(
  storeId: string,
  page: number,
  options?: { categoryId?: string; search?: string },
): Promise<ProductsPage> {
  return listProductsPublic(storeId, { ...options, page })
}

export async function getProductDetail(
  storeId: string,
  productId: string,
  options?: { includeVariants?: boolean },
): Promise<PublicProductDetail | null> {
  return getProductPublicDetail(storeId, productId, options)
}
