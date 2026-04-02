# Template — Componente Admin

> Leer antes: `/system/design/system-design.md`, `/system/design/components.md`, `/system/frontend/frontend-rules.md`

---

## Componente de listado con acciones

```typescript
// src/components/admin/{modulo}/{Entidad}List.tsx
'use client'

import { useState }             from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { toast }                from 'sonner'
import { Button }               from '@/components/ui/button'
import { Badge }                from '@/components/ui/badge'
import { Switch }               from '@/components/ui/switch'
import { PageHeader }           from '@/components/admin/shared/PageHeader'
import { EmptyState }           from '@/components/admin/shared/EmptyState'
import { StatusBadge }          from '@/components/admin/shared/StatusBadge'
import { ConfirmDialog }        from '@/components/admin/shared/ConfirmDialog'
import { {Entidad}Form }        from './{Entidad}Form'
import {
  delete{Entidad}Action,
  toggle{Entidad}ActiveAction,
} from '@/app/(admin)/admin/{modulo}/actions'

// {ADAPTAR}: tipo de la entidad (usar el tipo de /src/lib/types/index.ts si existe)
type {Entidad} = {
  id: string
  name: string
  is_active: boolean
  created_at: string
  // ... otros campos
}

type Props = {
  items: {Entidad}[]
}

export function {Entidad}List({ items }: Props) {
  const [formOpen, setFormOpen]     = useState(false)
  const [editItem, setEditItem]     = useState<{Entidad} | null>(null)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [loadingId, setLoadingId]   = useState<string | null>(null)

  // Toggle activo/inactivo
  async function handleToggle(id: string, currentValue: boolean) {
    setLoadingId(id)
    const result = await toggle{Entidad}ActiveAction(id, !currentValue)
    setLoadingId(null)
    if (!result.success) {
      toast.error(result.error.message)
    }
  }

  // Eliminar
  async function handleDelete(id: string) {
    const result = await delete{Entidad}Action(id)
    setDeleteId(null)
    if (result.success) {
      toast.success('{Entidad} eliminada.')
    } else {
      toast.error(result.error.message)
    }
  }

  if (items.length === 0) {
    return (
      <>
        <PageHeader
          title="{Entidades}"
          description="Gestión de {entidades} de tu tienda"
          actions={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          }
        />
        <EmptyState
          title="Sin {entidades} todavía"
          description="Creá tu primera {entidad} para empezar."
          action={{ label: 'Crear {entidad}', onClick: () => setFormOpen(true) }}
        />
        {formOpen && (
          <{Entidad}Form
            onClose={() => setFormOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="{Entidades}"
        description={`${items.length} ${items.length === 1 ? '{entidad}' : '{entidades}'}`}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        }
      />

      {/* Lista — mobile: cards apiladas / desktop: tabla */}
      <div className="space-y-2 md:hidden">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{'{'}item.name{'}'}</span>
              <StatusBadge status={item.is_active ? 'active' : 'inactive'} />
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditItem(item); setFormOpen(true) }}
              >
                <Pencil className="h-3 w-3 mr-1" /> Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:bg-red-50"
                onClick={() => setDeleteId(item.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Nombre</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Estado</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Activo</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{'{'}item.name{'}'}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={item.is_active ? 'active' : 'inactive'} />
                </td>
                <td className="py-3 px-4">
                  <Switch
                    checked={item.is_active}
                    disabled={loadingId === item.id}
                    onCheckedChange={() => handleToggle(item.id, item.is_active)}
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setEditItem(item); setFormOpen(true) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {formOpen && (
        <{Entidad}Form
          item={editItem ?? undefined}
          onClose={() => { setFormOpen(false); setEditItem(null) }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="¿Eliminar {entidad}?"
        description="Esta acción no se puede deshacer."
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}
```

---

## Componente de formulario (modal/drawer)

```typescript
// src/components/admin/{modulo}/{Entidad}Form.tsx
'use client'

import { useTransition }      from 'react'
import { useForm }            from 'react-hook-form'
import { zodResolver }        from '@hookform/resolvers/zod'
import { z }                  from 'zod'
import { toast }              from 'sonner'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button }             from '@/components/ui/button'
import { Input }              from '@/components/ui/input'
import { Textarea }           from '@/components/ui/textarea'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { create{Entidad}Action, update{Entidad}Action } from '@/app/(admin)/admin/{modulo}/actions'

// {ADAPTAR}: schema del formulario (puede coincidir con el del handler)
const formSchema = z.object({
  name:        z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  item?:    { id: string; name: string; description?: string }
  onClose:  () => void
}

export function {Entidad}Form({ item, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const isEditing = !!item

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name:        item?.name ?? '',
      description: item?.description ?? '',
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const formData = new FormData()
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined) formData.set(k, String(v))
      })

      const result = isEditing
        ? await update{Entidad}Action(item.id, formData)
        : await create{Entidad}Action(formData)

      if (result.success) {
        toast.success(isEditing ? '{Entidad} actualizada.' : '{Entidad} creada.')
        onClose()
      } else {
        if (result.error.field) {
          form.setError(result.error.field as keyof FormValues, {
            message: result.error.message,
          })
        } else {
          toast.error(result.error.message)
        }
      }
    })
  }

  return (
    <Drawer open onClose={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {isEditing ? 'Editar {entidad}' : 'Nueva {entidad}'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la {entidad}" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* {ADAPTAR}: agregar más campos según el módulo */}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
```

---

## Checklist del componente admin

- [ ] El archivo es `'use client'` si usa state, event handlers o hooks
- [ ] En mobile (< 768px): usa cards apiladas o lista, no tabla horizontal
- [ ] En desktop (≥ 768px): puede usar tabla o grid
- [ ] Estado vacío: muestra `EmptyState` con CTA, no pantalla en blanco
- [ ] Errores de Server Action: se muestran con `toast.error(result.error.message)`
- [ ] Éxito de Server Action: se confirma con `toast.success(...)`
- [ ] Toggle activo/inactivo: tiene feedback visual inmediato (disabled durante loading)
- [ ] Eliminar: siempre precedido de `ConfirmDialog`
- [ ] No hay lógica de negocio en el componente (solo UI y llamadas a actions)
- [ ] Los tipos de props están tipados (sin `any`)
