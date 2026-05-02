import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/db/queries/stores'
import { PublicLayout } from '@/components/public/public-layout'
import { StoreProvider } from '@/components/public/store-context'

export const dynamic = 'force-dynamic'

export default async function DemoStoreLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}) {
  const { slug } = await params
  const store = await getStoreBySlug(slug)

  if (!store || store.status !== 'demo') notFound()

  return (
    <StoreProvider store={store}>
      <PublicLayout>{children}</PublicLayout>
    </StoreProvider>
  )
}
