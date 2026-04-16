'use client'

import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats } from '@/lib/hooks/use-dashboard'
import { useCurrency } from '@/lib/hooks/use-currency'

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

export default function AdminDashboardPage() {
  const { data, isLoading } = useDashboardStats()
  const { formatPrice } = useCurrency()

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Resumen de tu tienda este mes.</p>
      </div>

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
    </div>
  )
}
