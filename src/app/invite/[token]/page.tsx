import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { acceptStoreInvitation } from '@/lib/invitations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  collaborator: 'Colaborador',
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const now = new Date().toISOString()

  // Buscar invitación (sin auth — solo lectura de metadata)
  const { data: invitation } = await db
    .from('store_invitations')
    .select('id, store_id, email, role, expires_at, accepted_at, store:stores(name, slug)')
    .eq('token', token)
    .single()

  // Token inválido
  if (!invitation) {
    return (
      <InviteCard
        icon={<AlertCircle className="h-6 w-6 text-destructive" />}
        title="Invitación no encontrada"
        description="El enlace de invitación no es válido o ya fue utilizado."
      >
        <Button render={<Link href="/auth/login" />} className="w-full">
          Ingresar a mi cuenta
        </Button>
      </InviteCard>
    )
  }

  // Invitación ya aceptada
  if (invitation.accepted_at !== null) {
    return (
      <InviteCard
        icon={<CheckCircle className="h-6 w-6 text-green-600" />}
        title="Invitación ya aceptada"
        description="Esta invitación ya fue utilizada anteriormente."
      >
        <Button render={<Link href="/admin" />} className="w-full">
          Ir al panel
        </Button>
      </InviteCard>
    )
  }

  // Invitación expirada
  if (invitation.expires_at < now) {
    return (
      <InviteCard
        icon={<AlertCircle className="h-6 w-6 text-destructive" />}
        title="Invitación expirada"
        description="Esta invitación expiró. Pedile al propietario de la tienda que te envíe una nueva."
      >
        <Button render={<Link href="/auth/login" />} variant="outline" className="w-full">
          Ingresar
        </Button>
      </InviteCard>
    )
  }

  const storeName = (invitation.store as { name?: string } | null)?.name ?? 'la tienda'
  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role

  // Verificar si el usuario está logueado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Redirigir a login con next param para volver después
    redirect(`/auth/login?next=/invite/${token}`)
  }

  // Usuario logueado — intentar aceptar la invitación
  const result = await acceptStoreInvitation(token)

  if (!result.success) {
    return (
      <InviteCard
        icon={<AlertCircle className="h-6 w-6 text-destructive" />}
        title="No se pudo aceptar la invitación"
        description={result.error.message}
      >
        <Button render={<Link href="/admin" />} className="w-full">
          Ir al panel
        </Button>
      </InviteCard>
    )
  }

  // Éxito — redirigir al admin
  redirect('/admin')
}

function InviteCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                {icon}
              </div>
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          {children && <CardContent className="space-y-3">{children}</CardContent>}
        </Card>
      </div>
    </div>
  )
}
