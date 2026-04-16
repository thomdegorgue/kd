import { listEvents } from '@/lib/db/queries/superadmin'
import { EventsTable } from '@/components/superadmin/events-table'

export default async function SuperadminEventsPage() {
  const { items, total } = await listEvents({ pageSize: 100 })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Eventos</h2>
        <p className="text-sm text-muted-foreground">
          Log de auditoría de todas las acciones del sistema.
        </p>
      </div>
      <EventsTable initialItems={items} total={total} />
    </div>
  )
}
