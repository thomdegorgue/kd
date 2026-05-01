import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowLeftRight, Smartphone } from 'lucide-react'
import { getCheckoutSuccessData } from '@/lib/actions/checkout'
import { getStoreBySlug } from '@/lib/db/queries/stores'
import { formatPriceShort } from '@/lib/utils/currency'

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams
  const orderId = typeof sp.order === 'string' ? sp.order : null
  const method = typeof sp.method === 'string' ? sp.method : null

  if (!orderId || !method) notFound()

  const [store, data] = await Promise.all([
    getStoreBySlug(slug),
    getCheckoutSuccessData(orderId, method),
  ])

  if (!store || !data) notFound()

  const brand = store.config?.primary_color ?? '#0f0f0f'

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Icono de éxito */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ background: `${brand}15` }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: brand }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">¡Pedido recibido!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Total: <span className="font-semibold text-foreground">{formatPriceShort(data.total)}</span>
            </p>
          </div>
        </div>

        {/* Info de pago */}
        {data.method === 'transfer' && data.transfer_info ? (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Datos para transferir</p>
            </div>
            <div className="px-4 py-4 space-y-3">
              {data.transfer_info.cbu && (
                <Row label="CBU / CVU" value={data.transfer_info.cbu} mono />
              )}
              {data.transfer_info.alias && (
                <Row label="Alias" value={data.transfer_info.alias} mono />
              )}
              {data.transfer_info.holder && (
                <Row label="Titular" value={data.transfer_info.holder} />
              )}
              {data.transfer_info.bank && (
                <Row label="Banco" value={data.transfer_info.bank} />
              )}
              {data.transfer_info.instructions && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Instrucciones</p>
                  <p className="text-sm whitespace-pre-wrap">{data.transfer_info.instructions}</p>
                </div>
              )}
            </div>
          </div>
        ) : data.method === 'mp' ? (
          <div className="rounded-2xl border bg-card px-4 py-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#009EE3]/10 flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-[#009EE3]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Pago procesado con Mercado Pago</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recibirás la confirmación en breve
              </p>
            </div>
          </div>
        ) : null}

        {/* Número de orden */}
        <div className="rounded-xl border bg-muted/20 px-4 py-3">
          <p className="text-xs text-muted-foreground">Número de pedido</p>
          <p className="text-xs font-mono text-foreground mt-0.5 break-all">{orderId}</p>
        </div>

        {/* Volver */}
        <Link
          href={`/${slug}`}
          className="flex items-center justify-center w-full py-3 rounded-xl border text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          Volver a la tienda
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs text-muted-foreground shrink-0">{label}</p>
      <p className={`text-sm font-medium text-right ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
