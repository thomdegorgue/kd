import type { ActionResult } from '@/lib/types'

/**
 * Comprueba que un ActionResult pueda cruzar el límite Server Action → cliente.
 * En producción, valores no JSON (BigInt, símbolos, referencias cíclicas) provocan
 * "An error occurred in the Server Components render" con mensaje omitido.
 */
export function ensureActionResultSerializable<T>(result: ActionResult<T>): ActionResult<T> {
  if (result == null || typeof result !== 'object' || !('success' in result)) {
    return { success: false, error: { code: 'SYSTEM_ERROR', message: 'Respuesta inválida' } } as ActionResult<never>
  }
  try {
    return JSON.parse(JSON.stringify(result)) as ActionResult<T>
  } catch (err) {
    console.error('[action-result] respuesta no serializable:', err)
    return {
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message:
          'La respuesta del servidor contiene datos que no se pudieron enviar. Si persiste, contactá soporte.',
      },
    } as ActionResult<never>
  }
}
