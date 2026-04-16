import { notFound } from 'next/navigation'
import { getShipmentByTrackingCode } from '@/lib/db/queries/shipments'
import { Package, Truck, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/date'

export const revalidate = 30

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  preparing: { label: 'Preparando', icon: Clock, variant: 'secondary' },
  in_transit: { label: 'En camino', icon: Truck, variant: 'default' },
  delivered: { label: 'Entregado', icon: CheckCircle2, variant: 'outline' },
  cancelled: { label: 'Cancelado', icon: XCircle, variant: 'destructive' },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return { title: `Seguimiento ${code}` }
}

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const shipment = await getShipmentByTrackingCode(code)

  if (!shipment) notFound()

  const config = STATUS_CONFIG[shipment.status] ?? STATUS_CONFIG.preparing
  const StatusIcon = config.icon

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
          <CardTitle className="text-lg">Seguimiento de envío</CardTitle>
          <p className="text-sm text-muted-foreground">{shipment.store_name}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-center gap-2">
            <StatusIcon className="h-5 w-5" />
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Código</span>
              <span className="font-mono font-medium">{shipment.tracking_code}</span>
            </div>
            {shipment.recipient_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destinatario</span>
                <span>{shipment.recipient_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>{formatDate(shipment.created_at)}</span>
            </div>
            {shipment.shipped_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Despachado</span>
                <span>{formatDate(shipment.shipped_at)}</span>
              </div>
            )}
            {shipment.delivered_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entregado</span>
                <span>{formatDate(shipment.delivered_at)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
