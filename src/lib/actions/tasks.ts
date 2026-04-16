'use server'

import { executeAction } from './helpers'
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/task'

export type TaskListResult = {
  items: Record<string, unknown>[]
  total: number
}

export type TaskFilters = {
  status?: string
  assigned_to?: string
  page?: number
  pageSize?: number
}

export async function listTasks(filters?: TaskFilters) {
  return executeAction<TaskListResult>('list_tasks', filters ?? {})
}

export async function createTask(input: CreateTaskInput) {
  return executeAction<Record<string, unknown>>('create_task', input)
}

export async function updateTask(input: UpdateTaskInput) {
  return executeAction<Record<string, unknown>>('update_task', input)
}

export async function completeTask(id: string) {
  return executeAction<Record<string, unknown>>('complete_task', { id })
}

export async function deleteTask(id: string) {
  return executeAction<{ deleted: boolean }>('delete_task', { id })
}
