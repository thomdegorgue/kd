'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserX, MailCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  useStoreUsers,
  useInvitations,
  useInviteStoreUser,
  useCancelInvitation,
  useRemoveStoreUser,
} from '@/lib/hooks/use-multiuser'
import { inviteStoreUserSchema, ROLE_LABELS, type InviteStoreUserInput } from '@/lib/validations/multiuser'
import { useAdminContext } from '@/lib/hooks/use-admin-context'

export default function TeamPage() {
  const { user_id, user_role } = useAdminContext()
  const { data: members = [], isLoading: membersLoading } = useStoreUsers()
  const { data: invitations = [], isLoading: invitationsLoading } = useInvitations()
  const inviteMutation = useInviteStoreUser()
  const cancelMutation = useCancelInvitation()
  const removeMutation = useRemoveStoreUser()

  const canInvite = user_role === 'owner' || user_role === 'admin'

  const form = useForm<InviteStoreUserInput>({
    resolver: zodResolver(inviteStoreUserSchema),
    defaultValues: { email: '', role: 'collaborator' },
  })

  async function onInvite(data: InviteStoreUserInput) {
    await inviteMutation.mutateAsync(data)
    form.reset()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h2 className="text-lg font-semibold">Equipo</h2>

      {/* Members list */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Miembros ({(members as Record<string, unknown>[]).length})</h3>

        {membersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {(members as Record<string, unknown>[]).map((m) => {
              const isMe = m.user_id === user_id
              const isOwner = m.role === 'owner'

              return (
                <div key={m.user_id as string} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.email as string}</p>
                    {isMe && <p className="text-xs text-muted-foreground">Vos</p>}
                  </div>
                  <Badge variant={isOwner ? 'default' : 'secondary'}>
                    {ROLE_LABELS[m.role as string] ?? m.role as string}
                  </Badge>
                  {!isOwner && !isMe && user_role === 'owner' && (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" />}
                      >
                        <UserX className="h-4 w-4 text-destructive" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover usuario</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Querés remover a {m.email as string} del equipo?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMutation.mutate(m.user_id as string)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Pending invitations */}
      {!invitationsLoading && (invitations as Record<string, unknown>[]).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Invitaciones pendientes ({(invitations as Record<string, unknown>[]).length})
          </h3>
          <div className="border rounded-lg divide-y">
            {(invitations as Record<string, unknown>[]).map((inv) => (
              <div key={inv.id as string} className="flex items-center gap-3 p-3">
                <MailCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{inv.email as string}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[inv.role as string] ?? inv.role as string} · Expira {new Date(inv.expires_at as string).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                  </p>
                </div>
                {canInvite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(inv.id as string)}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canInvite && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Invitar persona</h3>
          <form onSubmit={form.handleSubmit(onInvite)} className="space-y-3 p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="hola@ejemplo.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => form.setValue('role', v as 'admin' | 'collaborator')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — puede gestionar todo</SelectItem>
                  <SelectItem value="collaborator">Colaborador — solo lectura y pedidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviteMutation.isPending} className="w-full">
              {inviteMutation.isPending ? 'Enviando invitación...' : 'Invitar'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
