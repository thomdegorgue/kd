import { listWebhookLogs } from '@/lib/db/queries/superadmin'
import { WebhooksTable } from '@/components/superadmin/webhooks-table'

export default async function SuperadminWebhooksPage() {
  const { items, total } = await listWebhookLogs({ pageSize: 100 })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Webhooks MP</h2>
        <p className="text-sm text-muted-foreground">
          Log de eventos recibidos desde Mercado Pago.
        </p>
      </div>
      <WebhooksTable initialItems={items} total={total} />
    </div>
  )
}
