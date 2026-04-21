'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, Plus, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { ImageUploader } from '@/components/shared/image-uploader'
import { useBanners, useCreateBanner, useUpdateBanner, useDeleteBanner, useReorderBanners } from '@/lib/hooks/use-banners'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import type { Banner } from '@/lib/types'

type BannerRow = Banner & { id: string }

function SortableItem({
  banner,
  onEdit,
  onDelete,
}: {
  banner: BannerRow
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: banner.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg overflow-hidden"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="w-20 h-12 bg-muted rounded flex-shrink-0 relative overflow-hidden">
        {banner.image_url && (
          <Image
            src={banner.image_url}
            alt={banner.title || 'Banner'}
            fill
            className="object-cover"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{banner.title || '(sin título)'}</p>
        {banner.subtitle && <p className="text-xs text-muted-foreground truncate">{banner.subtitle}</p>}
        {banner.link_url && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <LinkIcon className="h-3 w-3" />
            <span className="truncate">{banner.link_url}</span>
          </div>
        )}
      </div>

      <Badge variant={banner.is_active ? 'default' : 'outline'} className="shrink-0">
        {banner.is_active ? 'Activo' : 'Inactivo'}
      </Badge>

      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default function BannersPage() {
  const { data: banners, isLoading } = useBanners()
  const { store_id } = useAdminContext()
  const createMutation = useCreateBanner()
  const updateMutation = useUpdateBanner()
  const deleteMutation = useDeleteBanner()
  const reorderMutation = useReorderBanners()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<BannerRow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', subtitle: '', link_url: '', is_active: true })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const items = (banners ?? []) as BannerRow[]

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    reorderMutation.mutate(reordered.map((b) => b.id))
  }

  function openCreate() {
    setEditingBanner(null)
    setImageUrl(null)
    setFormData({ title: '', subtitle: '', link_url: '', is_active: true })
    setSheetOpen(true)
  }

  function openEdit(banner: BannerRow) {
    setEditingBanner(banner)
    setImageUrl(banner.image_url)
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link_url: banner.link_url || '',
      is_active: banner.is_active,
    })
    setSheetOpen(true)
  }

  function handleSubmit() {
    if (!imageUrl) {
      alert('La imagen es requerida')
      return
    }

    const submitData = {
      image_url: imageUrl,
      title: formData.title || undefined,
      subtitle: formData.subtitle || undefined,
      link_url: formData.link_url || undefined,
      is_active: formData.is_active,
    }

    if (editingBanner) {
      updateMutation.mutate(
        { id: editingBanner.id, ...submitData },
        { onSuccess: () => setSheetOpen(false) }
      )
    } else {
      createMutation.mutate(submitData, {
        onSuccess: () => setSheetOpen(false),
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Banners</h2>
          <p className="text-sm text-muted-foreground">
            Arrastrá para reordenar. {items.length} banner{items.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aún no tenés banners. Agregá imágenes para mostrar en tu catálogo.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((banner) => (
                <SortableItem
                  key={banner.id}
                  banner={banner}
                  onEdit={() => openEdit(banner)}
                  onDelete={() => setDeleteId(banner.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingBanner ? 'Editar banner' : 'Nuevo banner'}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label className="mb-2 block">Imagen (obligatoria)</Label>
              {store_id && (
                <ImageUploader
                  storeId={store_id}
                  folder="banners"
                  maxFiles={1}
                  onUpload={(urls) => setImageUrl(urls[0] ?? null)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Nueva colección"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtítulo (opcional)</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="Ej: Descuento especial"
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_url">URL (opcional)</Label>
              <Input
                id="link_url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Activo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={isPending || !imageUrl}>
                {editingBanner ? 'Guardar cambios' : 'Crear banner'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar banner</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el banner de tu catálogo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId)
                  setDeleteId(null)
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
