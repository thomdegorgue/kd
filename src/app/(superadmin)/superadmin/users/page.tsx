import { listUsers } from '@/lib/db/queries/superadmin'
import { UsersTable } from '@/components/superadmin/users-table'

export default async function SuperadminUsersPage() {
  const { items, total } = await listUsers({ pageSize: 200 })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Usuarios</h2>
        <p className="text-sm text-muted-foreground">
          Gestión de todos los usuarios del sistema.
        </p>
      </div>
      <UsersTable initialItems={items} total={total} />
    </div>
  )
}
