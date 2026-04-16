import { supabaseServiceRole } from '@/lib/supabase/service-role'

export type ShipmentPublic = {
  tracking_code: string
  status: string
  store_name: string
  recipient_name: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/**
 * Obtiene un envío por tracking code para la página pública de seguimiento.
 * Usa service role. Solo retorna datos públicos (sin datos sensibles).
 */
export async function getShipmentByTrackingCode(code: string): Promise<ShipmentPublic | null> {
  const { data, error } = await db
    .from('shipments')
    .select('tracking_code, status, recipient_name, shipped_at, delivered_at, created_at, store_id')
    .eq('tracking_code', code)
    .single()

  if (error || !data) return null

  const shipment = data as {
    tracking_code: string
    status: string
    recipient_name: string | null
    shipped_at: string | null
    delivered_at: string | null
    created_at: string
    store_id: string
  }

  const { data: store } = await db
    .from('stores')
    .select('name')
    .eq('id', shipment.store_id)
    .single()

  return {
    tracking_code: shipment.tracking_code,
    status: shipment.status,
    store_name: (store as { name: string } | null)?.name ?? '',
    recipient_name: shipment.recipient_name,
    shipped_at: shipment.shipped_at,
    delivered_at: shipment.delivered_at,
    created_at: shipment.created_at,
  }
}
