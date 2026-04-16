import { listStores } from '@/lib/db/queries/superadmin'
import { StoresTable } from '@/components/superadmin/stores-table'

export default async function SuperadminStoresPage() {
  const { items, total } = await listStores({ pageSize: 200 })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tiendas</h2>
        <p className="text-sm text-muted-foreground">Gestión de todas las tiendas del sistema.</p>
      </div>
      <StoresTable initialItems={items} total={total} />
    </div>
  )
}
