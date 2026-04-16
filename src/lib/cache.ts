import { redis } from '@/lib/redis'

export async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const hit = await redis.get<T>(key)
  if (hit !== null) return hit
  const value = await fn()
  await redis.set(key, value, { ex: ttl })
  return value
}
