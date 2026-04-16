import Link from 'next/link'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signOut } from '@/lib/actions/auth'

export default function NoStorePage() {
  return (
    <Card>
      <CardHeader className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Store className="h-6 w-6 text-muted-foreground" />
          </div>
        </div>
        <CardTitle>No tenés una tienda asociada</CardTitle>
        <CardDescription>
          Tu cuenta existe pero no está vinculada a ninguna tienda. Podés crear una nueva o pedirle al propietario que te reenvíe la invitación.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button render={<Link href="/onboarding" />} className="w-full">
          Crear mi tienda
        </Button>
        <form action={signOut}>
          <Button variant="outline" className="w-full" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
