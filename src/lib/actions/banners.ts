'use server'

import { executeAction } from './helpers'
import type { CreateBannerInput, UpdateBannerInput } from '@/lib/validations/banner'
import type { Banner } from '@/lib/types'

export async function listBanners() {
  return executeAction<Banner[]>('list_banners')
}

export async function createBanner(input: CreateBannerInput) {
  return executeAction<Banner>('create_banner', input)
}

export async function updateBanner(input: UpdateBannerInput) {
  return executeAction<Banner>('update_banner', input)
}

export async function deleteBanner(id: string) {
  return executeAction<{ deleted: boolean }>('delete_banner', { id })
}

export async function reorderBanners(ids: string[]) {
  return executeAction<{ updated: boolean }>('reorder_banners', { ids })
}
