'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from '@/lib/hooks/use-tasks'
import { createTaskSchema, TASK_STATUS_LABELS, type CreateTaskInput } from '@/lib/validations/task'
import type { TaskStatus } from '@/lib/types'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'secondary',
  in_progress: 'default',
  done: 'outline',
  cancelled: 'outline',
}

const STATUS_FILTERS = ['', 'pending', 'in_progress', 'done', 'cancelled'] as const

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useTasks({ status: statusFilter || undefined })
  const createMutation = useCreateTask()
  const completeMutation = useCompleteTask()
  const deleteMutation = useDeleteTask()

  const tasks = data?.items ?? []
  const total = data?.total ?? 0

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
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tareas</h2>
          <p className="text-sm text-muted-foreground">{total} tareas</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </div>

      <EntityToolbar
        placeholder="Buscar tareas..."
        searchValue={search}
        onSearchChange={setSearch}
        filterPreset="tareas"
      />

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
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay tareas.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => {
            const task = t as unknown as {
              id: string
              title: string
              description: string | null
              status: TaskStatus
              due_date: string | null
            }
            const isDone = task.status === 'done' || task.status === 'cancelled'

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 border rounded-lg bg-card"
              >
                <button
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  disabled={isDone || completeMutation.isPending}
                  onClick={() => completeMutation.mutate(task.id)}
                  title="Marcar como hecho"
                >
                  <CheckCircle2
                    className={`h-5 w-5 ${isDone ? 'text-muted-foreground/40' : ''}`}
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>
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
                      <span className="text-xs text-muted-foreground">
                        Vence {new Date(task.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    )}
                  </div>
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...form.register('title')} placeholder="Describí la tarea..." />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea id="description" {...form.register('description')} rows={2} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="due_date">Fecha límite (opcional)</Label>
              <Input id="due_date" type="date" {...form.register('due_date')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
