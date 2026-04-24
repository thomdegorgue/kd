import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Contraseña mínimo 8 caracteres'),
  store_name: z.string().min(2, 'Nombre de tienda mínimo 2 caracteres').max(100),
  store_slug: z
    .string()
    .min(2, 'URL mínimo 2 caracteres')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
})

export type SignupInput = z.infer<typeof signupSchema>

/** Genera un slug válido desde un nombre */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}
