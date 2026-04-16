import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getStoreDetail } from '@/lib/db/queries/superadmin'
import { StoreDetailPanel } from '@/components/superadmin/store-detail-panel'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: 'Activa', className: 'bg-emerald-100 text-emerald-800' },
  demo: { label: 'Trial', className: 'bg-blue-100 text-blue-800' },
  past_due: { label: 'Mora', className: 'bg-amber-100 text-amber-800' },
  suspended: { label: 'Suspendida', className: 'bg-orange-100 text-orange-800' },
  archived: { label: 'Archivada', className: 'bg-muted text-muted-foreground' },
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let store
  try {
    store = await getStoreDetail(id)
  } catch {
    notFound()
  }

  const billing = STATUS_MAP[store.billing_status] ?? { label: store.billing_status, className: '' }
  const maxProducts = (store.limits as Record<string, number>).max_products ?? '—'

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <Link
          href="/superadmin/stores"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          Tiendas
        </Link>
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold">{store.name}</h2>
            <p className="text-sm text-muted-foreground">{store.slug}</p>
          </div>
          <Badge className={`${billing.className} hover:${billing.className}`}>
            {billing.label}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          <span>Tier: {maxProducts} productos</span>
          <span>
            Creada:{' '}
            {new Date(store.created_at).toLocaleDateString('es-AR')}
          </span>
          {store.trial_ends_at && (
            <span>
              Trial hasta:{' '}
              {new Date(store.trial_ends_at).toLocaleDateString('es-AR')}
            </span>
          )}
        </div>
      </div>

      <StoreDetailPanel store={store} />
    </div>
  )
}
