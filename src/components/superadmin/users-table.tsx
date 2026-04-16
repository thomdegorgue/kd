'use client'

import { useState, useTransition } from 'react'
import { Search, Ban, CheckCircle } from 'lucide-react'
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
import { useRouter } from 'next/navigation'
import type { UserRow } from '@/lib/db/queries/superadmin'
import { banUser, unbanUser } from '@/lib/actions/superadmin'

type Props = {
  initialItems: UserRow[]
  total: number
}

export function UsersTable({ initialItems, total }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [bannedFilter, setBannedFilter] = useState('all')
  const [actionMsg, setActionMsg] = useState<string | null>(null)

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
      setActionMsg(result.success ? 'Usuario baneado.' : result.error)
      if (result.success) router.refresh()
    })
  }

  const handleUnban = (userId: string) => {
    startTransition(async () => {
      const result = await unbanUser(userId)
      setActionMsg(result.success ? 'Ban removido.' : result.error)
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
        Mostrando {filtered.length} de {total} usuarios
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
                          title="Quitar ban"
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => handleBan(user.id)}
                          title="Banear usuario"
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
