'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Trash2,
  Calendar,
  PlayCircle,
  CheckCircle2,
  XCircle,
  ListTodo,
  Circle,
  LayoutGrid,
  List,
  GripVertical,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
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
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { EmptyState } from '@/components/shared/empty-state'
import { PackInactiveWarning } from '@/components/shared/pack-inactive-warning'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/hooks/use-tasks'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { createTaskSchema, TASK_STATUS_LABELS, type CreateTaskInput } from '@/lib/validations/task'
import type { TaskStatus, ModuleName } from '@/lib/types'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  done: 'outline',
  cancelled: 'outline',
}

const KANBAN_COLUMNS: { status: TaskStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
  { status: 'pending', label: 'Pendiente', icon: Circle },
  { status: 'in_progress', label: 'En progreso', icon: PlayCircle },
  { status: 'done', label: 'Hecho', icon: CheckCircle2 },
]

type TaskShape = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
}

function isOverdue(dueDate: string): boolean {
  const today = new Date()
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return new Date(dueDate).getTime() < t
}

function TaskCardContent({ task }: { task: TaskShape }) {
  const overdue = task.due_date ? isOverdue(task.due_date) : false
  const isDone = task.status === 'done'
  const isCancelled = task.status === 'cancelled'
  return (
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-medium leading-snug ${isDone || isCancelled ? 'line-through text-muted-foreground' : ''}`}>
        {task.title}
      </p>
      {task.description && (
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
      )}
      {task.due_date && (
        <span className={`inline-flex items-center gap-1 text-xs mt-1 ${
          overdue && !isDone && !isCancelled ? 'text-destructive' : 'text-muted-foreground'
        }`}>
          <Calendar className="h-3 w-3" />
          {new Date(task.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
        </span>
      )}
    </div>
  )
}

function SortableTaskCard({
  task,
  onClick,
}: {
  task: TaskShape
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-start gap-2 p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onClick}
    >
      <button
        type="button"
        className="shrink-0 mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label="Arrastrar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <TaskCardContent task={task} />
      <Badge variant={STATUS_VARIANT[task.status] ?? 'outline'} className="text-[10px] shrink-0 hidden sm:flex">
        {TASK_STATUS_LABELS[task.status] ?? task.status}
      </Badge>
    </div>
  )
}

function KanbanColumn({
  status,
  label,
  icon: Icon,
  tasks,
  onTaskClick,
}: {
  status: TaskStatus
  label: string
  icon: React.FC<{ className?: string }>
  tasks: TaskShape[]
  onTaskClick: (task: TaskShape) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}` })

  return (
    <div className="flex flex-col min-h-[200px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border-2 transition-colors p-2 space-y-2 min-h-[120px] ${
          isOver ? 'border-primary/50 bg-primary/5' : 'border-dashed border-muted'
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskShape | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [draggingTask, setDraggingTask] = useState<TaskShape | null>(null)

  const { modules } = useAdminContext()
  const { data, isLoading } = useTasks({})
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()

  const tasks = (data?.items ?? []) as unknown as TaskShape[]

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks
    const q = search.toLowerCase()
    return tasks.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q)
    )
  }, [tasks, search])

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskShape[]> = {
      pending: [], in_progress: [], done: [], cancelled: [],
    }
    filtered.forEach((t) => {
      if (map[t.status]) map[t.status].push(t)
    })
    return map
  }, [filtered])

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: '', description: '' },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
  )

  async function onSubmit(data: CreateTaskInput) {
    await createMutation.mutateAsync(data)
    form.reset()
    setShowCreate(false)
  }

  function handleDragStart(event: DragStartEvent) {
    const task = filtered.find((t) => t.id === event.active.id)
    if (task) setDraggingTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingTask(null)
    const { active, over } = event
    if (!over) return

    const overId = String(over.id)
    const targetStatus = overId.startsWith('column-')
      ? (overId.replace('column-', '') as TaskStatus)
      : (filtered.find((t) => t.id === overId)?.status ?? null)

    if (!targetStatus) return

    const task = filtered.find((t) => t.id === active.id)
    if (!task || task.status === targetStatus) return

    await updateMutation.mutateAsync({ id: task.id, status: targetStatus })
  }

  function openDetail(task: TaskShape) {
    setSelectedTask(task)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Tareas</h2>
              <p className="text-xs text-muted-foreground mt-1">{tasks.length} tareas</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* View toggle — desktop only */}
            <div className="hidden md:flex items-center border rounded-lg overflow-hidden">
              <button
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                  view === 'kanban' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => setView('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </button>
              <button
                className={`px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                  view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => setView('list')}
              >
                <List className="h-3.5 w-3.5" />
                Lista
              </button>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Nueva
            </Button>
          </div>
        </div>

        <PackInactiveWarning
          requiredModule={'tasks' as ModuleName}
          activeModules={modules as Record<ModuleName, boolean>}
        />
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar tareas..."
          searchValue={search}
          onSearchChange={setSearch}
          filterPreset="tareas"
        />
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ListTodo className="h-12 w-12" />}
            title="Sin tareas"
            description="Creá una tarea para empezar a organizar tu trabajo."
            action={
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva tarea
              </Button>
            }
          />
        ) : (
          <>
            {/* Mobile: cards agrupadas por estado */}
            <div className="md:hidden space-y-4">
              {KANBAN_COLUMNS.map(({ status, label, icon: Icon }) => {
                const colTasks = byStatus[status]
                if (colTasks.length === 0) return null
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">{label}</h3>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {colTasks.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {colTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => openDetail(task)}
                        >
                          <Checkbox
                            checked={task.status === 'done'}
                            onCheckedChange={(checked) => {
                              updateMutation.mutate({ id: task.id, status: checked ? 'done' : 'pending' })
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Marcar como hecho"
                            className="mt-0.5 shrink-0"
                          />
                          <TaskCardContent task={task} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: Kanban or List */}
            <div className="hidden md:block">
              {view === 'kanban' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="grid grid-cols-3 gap-4">
                    {KANBAN_COLUMNS.map(({ status, label, icon }) => (
                      <KanbanColumn
                        key={status}
                        status={status}
                        label={label}
                        icon={icon}
                        tasks={byStatus[status]}
                        onTaskClick={openDetail}
                      />
                    ))}
                  </div>
                  <DragOverlay>
                    {draggingTask && (
                      <div className="flex items-start gap-2 p-3 rounded-lg border bg-card shadow-lg rotate-1 opacity-90">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <TaskCardContent task={draggingTask} />
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              ) : (
                <div className="space-y-2">
                  {filtered.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 cursor-pointer"
                      onClick={() => openDetail(task)}
                    >
                      <Checkbox
                        checked={task.status === 'done'}
                        onCheckedChange={(checked) => {
                          updateMutation.mutate({ id: task.id, status: checked ? 'done' : 'pending' })
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 shrink-0"
                      />
                      <TaskCardContent task={task} />
                      <Badge variant={STATUS_VARIANT[task.status] ?? 'outline'} className="text-xs shrink-0">
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sheet detalle de tarea */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              Detalle
            </SheetTitle>
          </SheetHeader>
          {selectedTask && (
            <div className="py-4 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Título</p>
                  <p className="text-sm font-medium mt-0.5">{selectedTask.title}</p>
                </div>
                {selectedTask.description && (
                  <div>
                    <p className="text-xs text-muted-foreground">Descripción</p>
                    <p className="text-sm mt-0.5">{selectedTask.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge variant={STATUS_VARIANT[selectedTask.status] ?? 'outline'} className="mt-1">
                      {TASK_STATUS_LABELS[selectedTask.status] ?? selectedTask.status}
                    </Badge>
                  </div>
                  {selectedTask.due_date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Vencimiento</p>
                      <p className={`text-sm font-medium mt-0.5 ${
                        isOverdue(selectedTask.due_date) && selectedTask.status !== 'done' ? 'text-destructive' : ''
                      }`}>
                        {new Date(selectedTask.due_date).toLocaleDateString('es-AR', {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cambiar estado */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Cambiar estado</p>
                <div className="flex flex-wrap gap-2">
                  {(['pending', 'in_progress', 'done', 'cancelled'] as TaskStatus[])
                    .filter((s) => s !== selectedTask.status)
                    .map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        disabled={updateMutation.isPending}
                        onClick={() => {
                          updateMutation.mutate({ id: selectedTask.id, status: s })
                          setSelectedTask({ ...selectedTask, status: s })
                        }}
                      >
                        {TASK_STATUS_LABELS[s]}
                      </Button>
                    ))}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => { setDeleteId(selectedTask.id); setSelectedTask(null) }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar tarea
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet crear tarea */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-muted-foreground" />
              Nueva tarea
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...form.register('title')} placeholder="Describí la tarea..." />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción <span className="text-muted-foreground">(opcional)</span></Label>
              <Textarea id="description" {...form.register('description')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Fecha límite <span className="text-muted-foreground">(opcional)</span></Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* AlertDialog eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null) }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
