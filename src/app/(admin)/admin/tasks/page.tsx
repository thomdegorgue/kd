'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Calendar, PlayCircle, CheckCircle2, XCircle, ListTodo } from 'lucide-react'
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
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/lib/hooks/use-tasks'
import { createTaskSchema, TASK_STATUS_LABELS, type CreateTaskInput } from '@/lib/validations/task'
import type { TaskStatus } from '@/lib/types'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  done: 'outline',
  cancelled: 'outline',
}

const STATUS_FILTERS = ['', 'pending', 'in_progress', 'done', 'cancelled'] as const

function isOverdue(dueDate: string): boolean {
  const today = new Date()
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const d = new Date(dueDate).getTime()
  return d < t
}

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useTasks({ status: statusFilter || undefined })
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()

  const tasks = data?.items ?? []
  const total = data?.total ?? 0

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks
    const q = search.toLowerCase()
    return (tasks as Record<string, unknown>[]).filter((t) => {
      const title = String((t as { title?: string }).title ?? '').toLowerCase()
      const desc = String((t as { description?: string | null }).description ?? '').toLowerCase()
      return title.includes(q) || desc.includes(q)
    })
  }, [tasks, search])

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: '', description: '' },
  })

  async function onSubmit(data: CreateTaskInput) {
    await createMutation.mutateAsync(data)
    form.reset()
    setShowCreate(false)
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
              <p className="text-xs text-muted-foreground mt-1">{total} tareas</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar tareas..."
          searchValue={search}
          onSearchChange={setSearch}
          filterPreset="tareas"
        />
      </div>

      <div className="px-4 sm:px-6 space-y-6">
        {/* Status filter */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === '' ? 'Todas' : (TASK_STATUS_LABELS[s] ?? s)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No hay tareas.
          </div>
        ) : (
          <div className="space-y-2">
            {(filtered as Record<string, unknown>[]).map((t) => {
              const task = t as unknown as {
                id: string
                title: string
                description: string | null
                status: TaskStatus
                due_date: string | null
              }
              const isDone = task.status === 'done'
              const isCancelled = task.status === 'cancelled'
              const overdue = task.due_date ? isOverdue(task.due_date) : false

              const canEdit = !updateMutation.isPending

              async function setStatus(status: TaskStatus) {
                await updateMutation.mutateAsync({ id: task.id, status })
              }

              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                <div className="mt-0.5 shrink-0">
                  <Checkbox
                    checked={isDone}
                    disabled={isCancelled || !canEdit}
                    onCheckedChange={(checked) => {
                      setStatus(checked ? 'done' : 'pending')
                    }}
                    aria-label="Marcar como hecho"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isDone || isCancelled ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={STATUS_VARIANT[task.status] ?? 'outline'} className="text-xs">
                      {TASK_STATUS_LABELS[task.status] ?? task.status}
                    </Badge>
                    {task.due_date && (
                      <span className={`text-xs flex items-center gap-1 ${overdue && !isDone && !isCancelled ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <Calendar className="h-3.5 w-3.5" />
                        Vence {new Date(task.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {!isCancelled && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {task.status !== 'in_progress' && task.status !== 'done' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={!canEdit}
                          onClick={() => setStatus('in_progress')}
                        >
                          <PlayCircle className="h-3.5 w-3.5 mr-1" />
                          En progreso
                        </Button>
                      )}
                      {task.status !== 'done' && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={!canEdit}
                          onClick={() => setStatus('done')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Hecho
                        </Button>
                      )}
                      {task.status !== 'cancelled' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          disabled={!canEdit}
                          onClick={() => setStatus('cancelled')}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(task.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sheet para crear tarea */}
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
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea id="description" {...form.register('description')} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Fecha límite (opcional)</Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
