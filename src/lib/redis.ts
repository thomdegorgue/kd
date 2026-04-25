import { Redis } from '@upstash/redis'

function createRedis(): Redis | null {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
    return Redis.fromEnv()
  } catch {
    return null
  }
}

const _redis = createRedis()

// No-op fallback when Redis is not configured (dev without env vars)
export const redis: Redis = _redis ?? ({
  get: async () => null,
  set: async () => 'OK' as const,
  del: async () => 0,
} as unknown as Redis)
