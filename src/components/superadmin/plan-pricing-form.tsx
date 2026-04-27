'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import type { Plan } from '@/lib/types'
import type { ModuleName } from '@/lib/types'
import { BASE_MODULES, PRO_MODULES, formatARS } from '@/lib/billing/calculator'
import { updatePlanPricing } from '@/lib/actions/superadmin'

const ALL_MODULES: readonly ModuleName[] = [...BASE_MODULES, ...PRO_MODULES]

const MODULE_LABELS: Record<ModuleName, string> = {
  catalog: 'Catálogo',
  products: 'Productos',
  categories: 'Categorías',
  cart: 'Carrito',
  orders: 'Pedidos',
  stock: 'Stock',
  payments: 'Pagos',
  banners: 'Banners',
  social: 'Redes sociales',
  product_page: 'Página de producto',
  shipping: 'Envíos',
  variants: 'Variantes',
  wholesale: 'Mayorista',
  finance: 'Finanzas',
  expenses: 'Gastos',
  savings_account: 'Caja de ahorro',
  multiuser: 'Multiusuario',
  custom_domain: 'Dominio propio',
  tasks: 'Tareas',
  assistant: 'Asistente IA',
}

const schema = z.object({
  price_per_100_products: z.number().int().min(0),
  pro_module_price: z.number().int().min(0),
  trial_days: z.number().int().min(0),
  trial_max_products: z.number().int().min(1),
  base_modules: z.array(z.string()),
  annual_discount_months: z.number().int().min(0).max(11),
  max_stores_total: z.number().int().min(0).nullable(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  plan: Plan
}

export function PlanPricingForm({ plan }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const currentBaseModules = Array.isArray(plan.base_modules)
    ? (plan.base_modules as string[])
    : []

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      price_per_100_products: Math.round(plan.price_per_100_products / 100),
      pro_module_price: Math.round(plan.pro_module_price / 100),
      trial_days: plan.trial_days,
      trial_max_products: plan.trial_max_products,
      base_modules: currentBaseModules,
      annual_discount_months:
        (plan as unknown as { annual_discount_months?: number }).annual_discount_months ?? 2,
      max_stores_total:
        (plan as unknown as { max_stores_total?: number | null }).max_stores_total ?? null,
    },
  })

  const selectedBaseModules = watch('base_modules')

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await updatePlanPricing(plan.id, {
        price_per_100_products: values.price_per_100_products * 100,
        pro_module_price: values.pro_module_price * 100,
        trial_days: values.trial_days,
        trial_max_products: values.trial_max_products,
        base_modules: values.base_modules,
        annual_discount_months: values.annual_discount_months,
        max_stores_total: values.max_stores_total,
      })
      setMessage(result.success ? 'Plan actualizado.' : result.error.message)
      if (result.success) router.refresh()
    })
  }

  const toggleModule = (mod: string, checked: boolean) => {
    const current = selectedBaseModules ?? []
    if (checked) {
      setValue('base_modules', [...current, mod])
    } else {
      setValue('base_modules', current.filter((m) => m !== mod))
    }
  }

  const price100 = watch('price_per_100_products')
  const proPrice = watch('pro_module_price')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Precios */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="price_per_100" className="text-sm font-medium">
            Precio por 100 productos (ARS)
          </Label>
          <Input
            id="price_per_100"
            type="number"
            min={0}
            {...register('price_per_100_products', { valueAsNumber: true })}
          />
          {price100 > 0 && (
            <p className="text-xs text-muted-foreground">
              = {formatARS(price100 * 100)} / mes por cada 100 productos
            </p>
          )}
          {errors.price_per_100_products && (
            <p className="text-xs text-destructive">{errors.price_per_100_products.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pro_price" className="text-sm font-medium">
            Precio por módulo pro (ARS)
          </Label>
          <Input
            id="pro_price"
            type="number"
            min={0}
            {...register('pro_module_price', { valueAsNumber: true })}
          />
          {proPrice > 0 && (
            <p className="text-xs text-muted-foreground">
              = {formatARS(proPrice * 100)} / módulo / mes
            </p>
          )}
          {errors.pro_module_price && (
            <p className="text-xs text-destructive">{errors.pro_module_price.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trial_days" className="text-sm font-medium">
            Días de trial
          </Label>
          <Input
            id="trial_days"
            type="number"
            min={0}
            {...register('trial_days', { valueAsNumber: true })}
          />
          {errors.trial_days && (
            <p className="text-xs text-destructive">{errors.trial_days.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trial_max" className="text-sm font-medium">
            Productos máx. en trial
          </Label>
          <Input
            id="trial_max"
            type="number"
            min={1}
            {...register('trial_max_products', { valueAsNumber: true })}
          />
          {errors.trial_max_products && (
            <p className="text-xs text-destructive">{errors.trial_max_products.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="annual_discount" className="text-sm font-medium">
            Meses gratis en plan anual
          </Label>
          <Input
            id="annual_discount"
            type="number"
            min={0}
            max={11}
            {...register('annual_discount_months', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">
            Cliente paga (12 − N) meses. Default = 2 (paga 10, recibe 12).
          </p>
          {errors.annual_discount_months && (
            <p className="text-xs text-destructive">{errors.annual_discount_months.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="max_stores" className="text-sm font-medium">
            Cap máximo de tiendas
          </Label>
          <Input
            id="max_stores"
            type="number"
            min={0}
            placeholder="Sin límite"
            {...register('max_stores_total', {
              setValueAs: (v) =>
                v === '' || v === null || v === undefined ? null : Number(v),
            })}
          />
          <p className="text-xs text-muted-foreground">
            Vacío = sin límite. Vale para `create_store` global.
          </p>
        </div>
      </div>

      {/* Módulos base */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Módulos incluidos en el plan base</p>
          <p className="text-xs text-muted-foreground">
            Los módulos marcados están disponibles sin costo adicional.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_MODULES.map((mod) => {
            const isChecked = (selectedBaseModules ?? []).includes(mod)
            const isPro = PRO_MODULES.includes(mod)
            return (
              <div key={mod} className="flex items-center gap-2">
                <Checkbox
                  id={`mod-${mod}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => toggleModule(mod, checked === true)}
                />
                <label
                  htmlFor={`mod-${mod}`}
                  className="text-sm cursor-pointer select-none flex items-center gap-1.5"
                >
                  {MODULE_LABELS[mod]}
                  {isPro && (
                    <span className="text-[10px] text-muted-foreground border rounded px-1">
                      pro
                    </span>
                  )}
                </label>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </form>
  )
}
