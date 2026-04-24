'use client'

import Link from 'next/link'
import { Package, ShoppingCart, Users, DollarSign, ArrowRight, Share2, Settings, Plus, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import { useDashboardStats } from '@/lib/hooks/use-dashboard'
import { useOrders } from '@/lib/hooks/use-orders'
import { useCurrency } from '@/lib/hooks/use-currency'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import type { OrderStatus } from '@/lib/types'

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyDashboard({ slug }: { slug: string }) {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tu tienda está lista. Completá estos pasos para empezar a vender.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/products" className="group">
          <Card className="h-full transition-shadow hover:shadow-md cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-start gap-2 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-sm">Agregá tu primer producto</p>
              <p className="text-xs text-muted-foreground">Cargá foto, precio y descripción en menos de 2 minutos.</p>
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-auto group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/settings" className="group">
          <Card className="h-full transition-shadow hover:shadow-md cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-start gap-2 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Settings className="h-5 w-5 text-violet-600" />
              </div>
              <p className="font-medium text-sm">Configurá tu tienda</p>
              <p className="text-xs text-muted-foreground">Agregá tu logo, color de marca y número de WhatsApp.</p>
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-auto group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <a
          href={`https://${slug}.${appDomain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <Card className="h-full transition-shadow hover:shadow-md cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-start gap-2 p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Share2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="font-medium text-sm">Compartí tu catálogo</p>
              <p className="text-xs text-muted-foreground break-all">{slug}.{appDomain}</p>
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-auto group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </a>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useDashboardStats()
  const { data: recentOrdersData, isLoading: ordersLoading } = useOrders({ page: 1, pageSize: 5 })
  const { formatPrice } = useCurrency()
  const { slug } = useAdminContext()
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'kitdigital.ar'

  const isEmpty = !isLoading && (data?.products_count ?? 0) === 0 && (data?.orders_month ?? 0) === 0
  const recentOrders = recentOrdersData?.items ?? []

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Resumen de tu tienda este mes.</p>
      </div>

      {isEmpty ? (
        <EmptyDashboard slug={slug} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Productos"
              value={String(data?.products_count ?? 0)}
              icon={Package}
              loading={isLoading}
            />
            <StatCard
              title="Pedidos (mes)"
              value={String(data?.orders_month ?? 0)}
              icon={ShoppingCart}
              loading={isLoading}
            />
            <StatCard
              title="Ingresos (mes)"
              value={formatPrice(data?.revenue_month ?? 0)}
              icon={DollarSign}
              loading={isLoading}
            />
            <StatCard
              title="Clientes"
              value={String(data?.customers_count ?? 0)}
              icon={Users}
              loading={isLoading}
            />
          </div>

          {/* Quick actions */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Acciones rápidas</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/products" className={buttonVariants({ size: 'sm' })}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo producto
              </Link>
              <Link href="/admin/orders/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo pedido
              </Link>
              <a
                href={`https://${slug}.${appDomain}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver catálogo
              </a>
            </div>
          </div>

          {/* Recent orders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Últimos pedidos</h3>
              <Link href="/admin/orders" className="text-xs text-muted-foreground hover:underline">
                Ver todos
              </Link>
            </div>
            {ordersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aún no tenés pedidos.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {recentOrders.map((order) => {
                      const o = order as unknown as {
                        id: string
                        status: OrderStatus
                        total: number
                        created_at: string
                        customer: { name: string } | null
                      }
                      return (
                        <tr key={o.id} className="flex items-center gap-3 px-4 py-3">
                          <td className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                            {o.id.slice(0, 8)}...
                          </td>
                          <td className="flex-1 truncate font-medium">{o.customer?.name ?? '—'}</td>
                          <td className="shrink-0">
                            <OrderStatusBadge status={o.status} />
                          </td>
                          <td className="tabular-nums shrink-0">{formatPrice(o.total)}</td>
                          <td className="text-xs text-muted-foreground shrink-0">
                            {new Date(o.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
