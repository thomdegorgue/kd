import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

// Página temporal de visual check — reemplazar en F3/F4
export default function Home() {
  return (
    <main className="min-h-screen bg-background">

      {/* Navbar */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.jpg" alt="KitDigital" width={28} height={28} className="rounded-md" />
            <span className="text-sm font-semibold tracking-tight">KitDigital.ar</span>
          </div>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-sm font-normal">Precios</Button>
            <Button variant="ghost" size="sm" className="text-sm font-normal">Funciones</Button>
            <Button size="sm" className="text-sm">Empezar gratis</Button>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-20 space-y-24">

        {/* Hero */}
        <section className="text-center space-y-6">
          <Badge variant="secondary" className="text-xs font-medium px-3 py-1">
            Visual check — Design System
          </Badge>
          <h1 className="text-5xl font-semibold tracking-tight max-w-2xl mx-auto">
            Tu catálogo digital,{' '}
            <span className="text-muted-foreground">listo en minutos.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Creá tu catálogo online, recibí pedidos por WhatsApp y gestioná todo desde un panel simple.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button size="lg" className="px-8 text-sm font-medium">Crear mi tienda</Button>
            <Button size="lg" variant="outline" className="px-8 text-sm font-medium">Ver demo</Button>
          </div>
        </section>

        <Separator />

        {/* Tipografía */}
        <section className="space-y-4">
          <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Tipografía — Inter</p>
          <div className="space-y-3">
            <p className="text-5xl font-semibold tracking-tight">Display 5xl · Semibold</p>
            <p className="text-4xl font-semibold tracking-tight">Heading 4xl · Semibold</p>
            <p className="text-3xl font-semibold tracking-tight">Heading 3xl · Semibold</p>
            <p className="text-2xl font-semibold tracking-tight">Heading 2xl · Semibold</p>
            <p className="text-xl font-medium">Title XL · Medium</p>
            <p className="text-lg font-medium">Title LG · Medium</p>
            <p className="text-base">Body base — El dueño recibe el pedido por WhatsApp y lo confirma en el panel.</p>
            <p className="text-sm text-muted-foreground">Body SM muted — Información secundaria, descripciones, metadatos.</p>
            <p className="text-xs text-muted-foreground tracking-wider uppercase">Label XS uppercase — Categoría / Estado</p>
          </div>
        </section>

        <Separator />

        {/* Botones */}
        <section className="space-y-4">
          <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Botones</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">SM</Button>
            <Button size="default">Default</Button>
            <Button size="lg">LG</Button>
          </div>
        </section>

        <Separator />

        {/* Badges */}
        <section className="space-y-4">
          <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Badges / Estados</p>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Error</Badge>
            <Badge className="bg-success text-white hover:bg-success/90">Activo</Badge>
            <Badge className="bg-warning text-white hover:bg-warning/90">Pendiente</Badge>
          </div>
        </section>

        <Separator />

        {/* Cards */}
        <section className="space-y-4">
          <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Cards</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Productos', value: '24', desc: '+3 esta semana' },
              { title: 'Pedidos', value: '142', desc: '8 pendientes hoy' },
              { title: 'Clientes', value: '89', desc: '5 nuevos este mes' },
            ].map((item) => (
              <Card key={item.title}>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium uppercase tracking-wide">
                    {item.title}
                  </CardDescription>
                  <CardTitle className="text-3xl font-semibold tracking-tight">{item.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* Form */}
        <section className="space-y-4">
          <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Formularios</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Nombre del producto</Label>
              <Input id="name" placeholder="Ej: Remera básica negra" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-sm font-medium">Precio</Label>
              <Input id="price" type="number" placeholder="0" />
            </div>
            <Button className="w-fit">Guardar producto</Button>
          </div>
        </section>

        <Separator />

        {/* Paleta */}
        <section className="space-y-4">
          <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground">Paleta de colores</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Primary · #1b1b1b',   cls: 'bg-primary text-primary-foreground' },
              { label: 'Secondary · #f6f6f6', cls: 'bg-secondary text-secondary-foreground border' },
              { label: 'Muted · #f6f6f6',     cls: 'bg-muted text-muted-foreground border' },
              { label: 'Success',              cls: 'bg-success text-white' },
              { label: 'Warning',              cls: 'bg-warning text-white' },
              { label: 'Error',                cls: 'bg-error text-white' },
              { label: 'Destructive',          cls: 'bg-destructive text-white' },
            ].map((c) => (
              <div key={c.label} className={`${c.cls} rounded-lg px-4 py-3 text-xs font-medium min-w-[150px]`}>
                {c.label}
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-24 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="KitDigital" width={20} height={20} className="rounded" />
            <span className="text-xs text-muted-foreground font-medium">KitDigital.ar</span>
          </div>
          <p className="text-xs text-muted-foreground">F1 — Visual Check</p>
        </div>
      </footer>

    </main>
  )
}
