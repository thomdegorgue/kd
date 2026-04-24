import { redirect } from 'next/navigation'
import { getStoreContextOrNull } from '@/lib/auth/store-context'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const storeContext = await getStoreContextOrNull()
  if (!storeContext) redirect('/auth/login')

  return (
    <AdminShell storeContext={storeContext}>
      {children}
    </AdminShell>
  )
}
