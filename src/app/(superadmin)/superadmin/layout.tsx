import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { SuperadminShell } from '@/components/superadmin/superadmin-shell'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )

  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/superadmin')
  }

  const { data: userData } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'superadmin') {
    redirect('/')
  }

  return <SuperadminShell>{children}</SuperadminShell>
}
