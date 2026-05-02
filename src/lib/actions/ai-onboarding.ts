'use server'

import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable name convention — consistent with other actions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/**
 * Genera una categoría + producto personalizados para la tienda recién creada.
 * Idempotente: si ya se ejecutó (ai_onboarding_done = true), retorna sin hacer nada.
 * Tiene fallback: si OpenAI falla o excede el timeout, inserta contenido genérico.
 */
export async function generateOnboardingContent(storeId: string): Promise<void> {
  const { data: store } = await db
    .from('stores')
    .select('name, description, config')
    .eq('id', storeId)
    .single()

  if (!store) return

  const currentConfig = (store.config ?? {}) as Record<string, unknown>

  if (currentConfig.ai_onboarding_done === true) return

  // Lock optimista: evitar dos jobs paralelos
  await db
    .from('stores')
    .update({ config: { ...currentConfig, ai_onboarding_status: 'pending' } })
    .eq('id', storeId)

  const storeName = (store.name as string | null) ?? 'Mi tienda'
  const storeDescription = (store.description as string | null) ?? storeName

  let categoryData = { name: 'Mis productos', description: 'Todos mis productos' }
  let productData = { name: 'Mi primer producto', description: 'Producto de ejemplo. Editalo desde el panel de administración.', price: 5000 }

  try {
    const OpenAI = (await import('openai')).default
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const timeoutMs = 12_000
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('OpenAI timeout')), timeoutMs)
    )

    const completionPromise = openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Sos un asistente que ayuda a crear catálogos digitales en Argentina.

Tienda: "${storeName}"
Descripción del negocio: "${storeDescription}"

Generá en JSON con estas claves exactas:
{
  "category": { "name": string, "description": string },
  "product": {
    "name": string,
    "description": string,
    "price": number
  }
}

Reglas:
- Todo en español argentino
- Precios en pesos ARS, número entero razonable para 2025 (ej: 5000, 15000, 80000)
- Descripción de producto: 2-3 oraciones, tono amigable y persuasivo
- Nombre de categoría: corto, descriptivo (máx 40 caracteres)`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    })

    const completion = await Promise.race([completionPromise, timeoutPromise])
    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}') as Record<string, unknown>

    if (parsed.category && typeof (parsed.category as Record<string, unknown>).name === 'string') {
      categoryData = parsed.category as typeof categoryData
    }
    if (parsed.product && typeof (parsed.product as Record<string, unknown>).name === 'string') {
      const p = parsed.product as Record<string, unknown>
      productData = {
        name: String(p.name),
        description: String(p.description ?? ''),
        price: typeof p.price === 'number' ? p.price : 5000,
      }
    }
  } catch {
    // Timeout o error de OpenAI → usar valores genéricos (fallback ya asignado arriba)
  }

  // Crear categoría
  const { data: createdCategory } = await db
    .from('categories')
    .insert({
      store_id: storeId,
      name: categoryData.name,
      description: categoryData.description || null,
      is_active: true,
    })
    .select('id')
    .single()

  // Crear producto
  const { data: createdProduct } = await db
    .from('products')
    .insert({
      store_id: storeId,
      name: productData.name,
      description: productData.description || null,
      price: Math.round(Math.max(productData.price, 0) * 100),
      is_active: true,
    })
    .select('id')
    .single()

  // Asignar producto a categoría
  if (createdCategory?.id && createdProduct?.id) {
    await db
      .from('product_categories')
      .insert({
        product_id: createdProduct.id,
        category_id: createdCategory.id,
        store_id: storeId,
      })
      .maybeSingle()
  }

  // Marcar como completado (merge sobre config actualizado)
  const { data: freshStore } = await db
    .from('stores')
    .select('config')
    .eq('id', storeId)
    .single()
  const freshConfig = (freshStore?.config ?? {}) as Record<string, unknown>

  await db
    .from('stores')
    .update({ config: { ...freshConfig, ai_onboarding_done: true, ai_onboarding_status: 'done' } })
    .eq('id', storeId)
}
