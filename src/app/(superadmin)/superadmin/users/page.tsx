import { listUsers } from '@/lib/db/queries/superadmin'
import { UsersTable } from '@/components/superadmin/users-table'

const PAGE_SIZE = 50

export default async function SuperadminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1))
  const { items, total } = await listUsers({
    page,
    pageSize: PAGE_SIZE,
    search: params.search,
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Usuarios</h2>
        <p className="text-sm text-muted-foreground">
          Gestión de todos los usuarios del sistema.
        </p>
      </div>
      <UsersTable
        initialItems={items}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
