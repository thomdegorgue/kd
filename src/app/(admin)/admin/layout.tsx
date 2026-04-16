import { getStoreContext } from '@/lib/auth/store-context'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const storeContext = await getStoreContext()

  return (
    <AdminShell storeContext={storeContext}>
      {children}
    </AdminShell>
  )
}
