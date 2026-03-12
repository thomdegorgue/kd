# Spec 02: Onboarding con IA

**Fase**: 2 (Core)  
**Prioridad**: ALTA (momento "wow" del producto)  
**Dependencias**: `spec-01-multitenancy-middleware.md` (debe estar completo)

## Referencias obligatorias

Antes de implementar, lee:
- `@/ai-instructions/01-master-document.md` (sección 7.1: Onboarding con IA)
- `@/ai-instructions/02-schema.sql` (tablas: `tenants`, `categories`, `products`, `tenant_portada_principal`)
- `@/ai-instructions/05-project-structure.md` (rutas: `app/(auth)/`, Edge Functions)

## Objetivo

Implementar el flujo "Creá tu Kit en 60 segundos": onboarding guiado que crea tenant + datos iniciales (categorías, productos, portada) usando IA.

## Contexto

El onboarding es el primer contacto del usuario con KitDigital.ar. Debe ser:
- **Rápido**: 60 segundos desde inicio hasta vitrina funcionando
- **Mágico**: La IA genera contenido relevante automáticamente
- **Simple**: Solo 4 inputs básicos

## Estructura de implementación

### 1. UI de Onboarding (3 pasos)

**Ubicación**: `app/(auth)/onboarding/page.tsx` (o ruta similar)

**Pasos**:
1. **Paso 1 - Inputs**:
   - Nombre del negocio (input text)
   - WhatsApp del comercio (input text, formato: +54911...)
   - "¿De qué trata tu negocio?" (textarea)
   - Color principal (color picker)

2. **Paso 2 - Procesamiento IA**:
   - Loading state
   - Llamada a Edge Function
   - Mostrar progreso

3. **Paso 3 - Resultado**:
   - Confirmación de creación
   - Redirección a dashboard

**Estructura (alto nivel)**:
```typescript
// app/(auth)/onboarding/page.tsx
export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({...});
  
  // Paso 1: Formulario
  // Paso 2: Llamada a Edge Function
  // Paso 3: Redirección
}
```

### 2. Edge Function (Supabase)

**Nombre**: `onboarding-ai`

**Ubicación**: `supabase/functions/onboarding-ai/index.ts`

**Responsabilidades**:
- Recibir inputs del usuario
- Llamar a OpenAI GPT-4o-mini con prompt estructurado
- Generar: categorías (5), productos (8), portada (título + subtítulo)
- Crear tenant en DB
- Crear datos seed (categorías, productos, portada)
- Retornar resultado

**Prompt estructura (alto nivel)**:
```
Eres experto en emprendimientos argentinos. 
Crea 5 categorías y 8 productos de ejemplo para un negocio de {descripcion}. 
Precios realistas en ARS.
```

**Estructura (alto nivel)**:
```typescript
// supabase/functions/onboarding-ai/index.ts
Deno.serve(async (req) => {
  const { name, whatsapp, descripcion, primary_color } = await req.json();
  
  // 1. Llamar a OpenAI
  // 2. Parsear respuesta (categorías, productos, portada)
  // 3. Crear tenant
  // 4. Crear categorías
  // 5. Crear productos
  // 6. Crear portada
  // 7. Retornar resultado
});
```

### 3. Generación de slug

**Lógica**:
- Convertir nombre del negocio a slug (lowercase, sin espacios, sin caracteres especiales)
- Verificar que no exista en DB
- Si existe, agregar número: `mi-negocio-2`

**Ubicación**: Edge Function o helper en `lib/tenant/`

### 4. Persistencia en DB

**Tablas afectadas** (en orden):
1. `tenants` (crear tenant)
2. `categories` (crear 5 categorías)
3. `products` (crear 8 productos)
4. `tenant_portada_principal` (crear portada)

**Nota**: Usar transacciones si es posible para atomicidad.

## Checklist de implementación

### UI
- [ ] Crear página de onboarding (`app/(auth)/onboarding/page.tsx`)
- [ ] Implementar Paso 1 (formulario con 4 inputs)
- [ ] Validar inputs (nombre, WhatsApp formato, etc.)
- [ ] Implementar Paso 2 (loading + llamada a Edge Function)
- [ ] Implementar Paso 3 (confirmación + redirección)
- [ ] Manejar errores (mostrar mensajes claros)

### Edge Function
- [ ] Crear Edge Function `onboarding-ai`
- [ ] Configurar OpenAI client
- [ ] Implementar prompt estructurado
- [ ] Parsear respuesta de OpenAI (JSON estructurado)
- [ ] Generar slug único
- [ ] Crear tenant en DB
- [ ] Crear categorías (5)
- [ ] Crear productos (8)
- [ ] Crear portada principal
- [ ] Manejar errores y rollback si es necesario

### Integración
- [ ] Conectar UI con Edge Function
- [ ] Manejar autenticación (crear usuario si es necesario)
- [ ] Setear claims JWT (`tenant_id`, `role`)
- [ ] Redirigir a dashboard después de éxito

### Testing
- [ ] Verificar que se crea tenant correctamente
- [ ] Verificar que se crean categorías (5)
- [ ] Verificar que se crean productos (8)
- [ ] Verificar que se crea portada
- [ ] Verificar que slug es único
- [ ] Verificar que contenido generado es relevante
- [ ] Verificar manejo de errores

## Notas importantes

1. **OpenAI**: Usar `gpt-4o-mini` (más barato) con `response_format: { type: "json_object" }`
2. **Validación**: Validar formato de WhatsApp (debe empezar con +)
3. **Slug**: Asegurar que slug sea URL-safe y único
4. **Atomicidad**: Si falla creación de productos, hacer rollback del tenant
5. **Límites**: Respetar `plan_product_limit` del tenant (default: 100)

## Próximos pasos

Una vez completado este spec:
- **Siguiente**: `spec-03-modulos-potenciadores.md` (Fase 2)
- **Requisito**: Este spec debe estar 100% funcional antes de avanzar

