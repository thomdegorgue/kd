'use client'

import { useState, useTransition } from 'react'
import { Search, Ban, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/alert-dialog'
import { useRouter, usePathname } from 'next/navigation'
import type { UserRow } from '@/lib/db/queries/superadmin'
import { banUser, unbanUser } from '@/lib/actions/superadmin'

type Props = {
  initialItems: UserRow[]
  total: number
  page: number
  pageSize: number
}

export function UsersTable({ initialItems, total, page, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [bannedFilter, setBannedFilter] = useState('all')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [banConfirmUserId, setBanConfirmUserId] = useState<string | null>(null)
  const totalPages = Math.ceil(total / pageSize)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', String(newPage))
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  const filtered = initialItems.filter((u) => {
    const matchSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchBanned =
      bannedFilter === 'all' ||
      (bannedFilter === 'banned' && !!u.banned_at) ||
      (bannedFilter === 'active' && !u.banned_at)
    return matchSearch && matchRole && matchBanned
  })

  const handleBan = (userId: string) => {
    startTransition(async () => {
      const result = await banUser(userId)
      setActionMsg(result.success ? 'Usuario baneado.' : result.error.message)
      if (result.success) router.refresh()
    })
  }

  const handleUnban = (userId: string) => {
    startTransition(async () => {
      const result = await unbanUser(userId)
      setActionMsg(result.success ? 'Ban removido.' : result.error.message)
      if (result.success) router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email o nombre..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
            <SelectItem value="superadmin">Superadmin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={bannedFilter} onValueChange={(v) => setBannedFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="banned">Baneados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionMsg && (
        <p className="text-xs text-muted-foreground">{actionMsg}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {total} usuarios · página {page} de {totalPages || 1}
        {filtered.length !== initialItems.length && ` (${filtered.length} filtrados)`}
      </p>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Usuario</th>
                <th className="text-left px-4 py-2 font-medium">Rol</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-left px-4 py-2 font-medium">Creado</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.email}</p>
                    {user.full_name && (
                      <p className="text-xs text-muted-foreground">{user.full_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.role === 'superadmin' ? (
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                        Superadmin
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Usuario</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.banned_at ? (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Baneado</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Activo
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    {user.role !== 'superadmin' && (
                      user.banned_at ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => handleUnban(user.id)}
                          aria-label="Quitar ban"
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => setBanConfirmUserId(user.id)}
                            aria-label="Banear usuario"
                          >
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                          <AlertDialog
                            open={banConfirmUserId === user.id}
                            onOpenChange={(open) => { if (!open) setBanConfirmUserId(null) }}
                          >
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Banear usuario</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Banear a <strong>{user.email}</strong>? No podrá acceder hasta que se quite el ban.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => {
                                    setBanConfirmUserId(null)
                                    handleBan(user.id)
                                  }}
                                >
                                  Sí, banear
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || pending}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || pending}
            onClick={() => handlePageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
