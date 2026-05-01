'use client'

import { useState } from 'react'
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
import { GripVertical, Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { CategoryForm } from '@/components/admin/category-form'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
} from '@/lib/hooks/use-categories'
import type { CategoryWithCount } from '@/lib/actions/categories'

type CategoryRow = CategoryWithCount & { id: string; name: string; is_active: boolean; product_count: number }

function SortableItem({
  category,
  onEdit,
  onDelete,
}: {
  category: CategoryRow
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
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
      className="flex items-center gap-3 p-3 bg-background border rounded-lg"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.product_count} producto{category.product_count !== 1 ? 's' : ''}
        </p>
      </div>

      <Badge variant={category.is_active ? 'default' : 'outline'} className="shrink-0">
        {category.is_active ? 'Activa' : 'Inactiva'}
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

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
  const reorderMutation = useReorderCategories()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const items = (categories ?? []) as CategoryRow[]

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    reorderMutation.mutate(reordered.map((c) => c.id))
  }

  function openCreate() {
    setEditingCategory(null)
    setSheetOpen(true)
  }

  function openEdit(cat: CategoryRow) {
    setEditingCategory(cat)
    setSheetOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Categorías</h2>
          <p className="text-sm text-muted-foreground">
            Arrastrá para reordenar. {items.length} categoría{items.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aún no tenés categorías.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((cat) => (
                <SortableItem
                  key={cat.id}
                  category={cat}
                  onEdit={() => openEdit(cat)}
                  onDelete={() => setDeleteId(cat.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create / Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <CategoryForm
              defaultValues={editingCategory ? { id: editingCategory.id, name: editingCategory.name, is_active: editingCategory.is_active } : undefined}
              isPending={createMutation.isPending || updateMutation.isPending}
              submitLabel={editingCategory ? 'Guardar cambios' : 'Crear categoría'}
              onSubmit={(data) => {
                if (editingCategory) {
                  updateMutation.mutate(
                    { id: editingCategory.id, ...data },
                    { onSuccess: () => setSheetOpen(false) }
                  )
                } else {
                  createMutation.mutate(data, {
                    onSuccess: () => setSheetOpen(false),
                  })
                }
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán las asignaciones de productos. Los productos no se eliminan.
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
