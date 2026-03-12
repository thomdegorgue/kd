# KitDigital.ar

SaaS multitenant modular para catálogos digitales + carrito WhatsApp, 100% mobile-first, pensado para emprendedores y pymes de Argentina y Latam.

## 🚀 Inicio rápido

### Prerequisitos
- Node.js 18+
- Supabase account
- Vercel account (para deploy)

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd kitdigital.ar

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev
```

## 📚 Documentación

### Para desarrolladores

- **[DEVELOPMENT.md](./DEVELOPMENT.md)**: Guía completa de cómo desarrollar con IA
- **[Documento Técnico](./docs/Documento-Tecnico-Fundamental.md)**: Arquitectura y diseño completo
- **[Schema SQL](./docs/schema.sql)**: Esquema de base de datos

### Para IA (instrucciones automáticas)

- **[ai-instructions/](./ai-instructions/)**: Carpeta con todas las instrucciones para IA
  - `00-skills.md`: Reglas globales y constitución
  - `01-master-document.md`: Documento técnico (formato IA)
  - `02-schema.sql`: Schema SQL (formato IA)
  - `04-implementation-order.md`: Orden de implementación
  - `05-project-structure.md`: Estructura de carpetas

## 🏗️ Stack Tecnológico

- **Frontend**: Next.js 15 (App Router) + Tailwind + shadcn/ui + TanStack Query
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
- **IA**: OpenAI GPT-4o-mini (vía Edge Function)
- **Pagos**: Mercado Pago (suscripciones)
- **Analytics**: PostHog (self-hosted)
- **Hosting**: Vercel (wildcard subdomains)

## 📁 Estructura del Proyecto

```
kitdigital.ar/
├── ai-instructions/     # Instrucciones para IA
├── docs/                # Documentación para humanos
├── app/                 # Next.js App Router
├── components/          # Componentes React
├── lib/                 # Utilidades y helpers
├── hooks/               # React Hooks
└── types/               # Tipos TypeScript
```

Ver estructura completa en: [`ai-instructions/05-project-structure.md`](./ai-instructions/05-project-structure.md)

## 🎯 Características Principales

- **Multitenancy**: Una sola base de datos con aislamiento por tenant
- **Onboarding con IA**: "Creá tu Kit en 60 segundos"
- **Módulos Potenciadores**: Sistema modular con toggles
- **Vitrina Pública**: Catálogo público por tenant (subdominio o dominio custom)
- **Carrito WhatsApp**: Pedidos directos por WhatsApp
- **Mobile-first**: 100% responsive, optimizado para celular

## 🔐 Variables de Entorno

Ver `.env.example` para todas las variables necesarias:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `MP_ACCESS_TOKEN`
- Y más...

## 🚢 Deploy

Ver sección 8 del [Documento Técnico](./docs/Documento-Tecnico-Fundamental.md) para instrucciones completas de deploy.

### Checklist rápido:
- [ ] Configurar wildcard subdomain en Vercel (`*.kitdigital.ar`)
- [ ] Ejecutar `schema.sql` en Supabase
- [ ] Configurar variables de entorno en Vercel
- [ ] Configurar Edge Functions en Supabase
- [ ] Configurar PostHog (self-hosted)

## 📖 Nombres Oficiales

- **Producto**: KitDigital.ar
- **Catálogo público**: Mi Vitrina
- **Banner principal**: Portada Principal
- **Sección de módulos**: Módulos Potenciadores
- **Onboarding IA**: Creá tu Kit en 60 segundos

## 🤝 Contribuir

Este es un proyecto privado. Para más información sobre cómo trabajar con IA en este proyecto, ver [DEVELOPMENT.md](./DEVELOPMENT.md).

## 📄 Licencia

Privado - Todos los derechos reservados

---

**Versión**: 1.0  
**Última actualización**: Marzo 2026

