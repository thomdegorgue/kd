'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, XCircle, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  useCustomDomain,
  useSetCustomDomain,
  useVerifyCustomDomain,
  useRemoveCustomDomain,
} from '@/lib/hooks/use-custom-domain'
import { setCustomDomainSchema, type SetCustomDomainInput } from '@/lib/validations/custom-domain'
import { useAdminContext } from '@/lib/hooks/use-admin-context'

export default function DomainPage() {
  const { slug } = useAdminContext()
  const { data: domainData, isLoading } = useCustomDomain()
  const setMutation = useSetCustomDomain()
  const verifyMutation = useVerifyCustomDomain()
  const removeMutation = useRemoveCustomDomain()

  const form = useForm<SetCustomDomainInput>({
    resolver: zodResolver(setCustomDomainSchema),
    defaultValues: { domain: '' },
  })

  useEffect(() => {
    if (domainData?.custom_domain) {
      form.reset({ domain: domainData.custom_domain })
    }
  }, [domainData, form])

  async function onSubmit(data: SetCustomDomainInput) {
    await setMutation.mutateAsync(data)
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const hasDomain = !!domainData?.custom_domain
  const isVerified = domainData?.custom_domain_verified ?? false
  const txtToken = domainData?.custom_domain_txt_token

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dominio personalizado</h2>
        <p className="text-sm text-muted-foreground">
          Tu catálogo por defecto es{' '}
          <span className="font-mono text-foreground">{slug}.kitdigital.ar</span>
        </p>
      </div>

      {/* Current status */}
      {hasDomain && (
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{domainData?.custom_domain}</p>
              <div className="flex items-center gap-1 mt-1">
                {isVerified ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600">Verificado</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-xs text-destructive">Sin verificar</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!isVerified && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={verifyMutation.isPending}
                  onClick={() => verifyMutation.mutate()}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
                  Verificar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="outline" size="sm" />}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar dominio</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminará la configuración de dominio personalizado. El catálogo volverá a usar {slug}.kitdigital.ar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => removeMutation.mutate()}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {!isVerified && txtToken && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Instrucciones de verificación DNS</p>
                <p className="text-sm text-muted-foreground">
                  Agregá este registro TXT en el DNS de tu dominio:
                </p>
                <div className="grid gap-2 text-xs font-mono bg-muted p-3 rounded">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-16">Tipo</span>
                    <span>TXT</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-16">Nombre</span>
                    <span>_kitdigital-verify</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground w-16">Valor</span>
                    <span className="break-all">{txtToken}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Los cambios DNS pueden tardar hasta 48hs en propagarse. Una vez configurado, hacé clic en &quot;Verificar&quot;.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Set domain form */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{hasDomain ? 'Cambiar dominio' : 'Configurar dominio'}</h3>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="domain">Dominio</Label>
            <Input
              id="domain"
              placeholder="mitienda.com"
              {...form.register('domain')}
            />
            {form.formState.errors.domain && (
              <p className="text-xs text-destructive">{form.formState.errors.domain.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Sin www ni https. Ej: <span className="font-mono">mitienda.com</span>
            </p>
          </div>
          <Button type="submit" disabled={setMutation.isPending}>
            {setMutation.isPending ? 'Guardando...' : hasDomain ? 'Actualizar dominio' : 'Guardar dominio'}
          </Button>
        </form>
      </div>

      {!hasDomain && (
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted rounded">
          <p className="font-medium">¿Cómo funciona?</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Ingresá tu dominio y guardalo</li>
            <li>Agregá el registro TXT en tu proveedor de DNS</li>
            <li>Esperá la propagación (hasta 48hs) y verificá</li>
            <li>¡Listo! Tu catálogo estará en tu dominio propio</li>
          </ol>
        </div>
      )}

      {isVerified && (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {domainData?.custom_domain} verificado y activo
        </Badge>
      )}
    </div>
  )
}
