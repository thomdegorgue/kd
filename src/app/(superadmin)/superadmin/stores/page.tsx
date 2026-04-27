import { listStores } from '@/lib/db/queries/superadmin'
import { StoresTable } from '@/components/superadmin/stores-table'

const PAGE_SIZE = 50

export default async function SuperadminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const { items, total } = await listStores({
    page,
    pageSize: PAGE_SIZE,
    search: params.search,
    billing_status: params.status,
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tiendas</h2>
        <p className="text-sm text-muted-foreground">Gestión de todas las tiendas del sistema.</p>
      </div>
      <StoresTable
        initialItems={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        initialSearch={params.search}
        initialStatus={params.status}
      />
    </div>
  )
}
