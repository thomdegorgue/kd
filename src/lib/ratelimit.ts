import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'

// Para rutas API generales: 30 req/10s por IP
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '10 s'),
  prefix: 'kd:api',
})

// Para PDF (más costoso): 10 req/60s por IP
export const pdfLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  prefix: 'kd:pdf',
})

// Para checkout público (creación de pedidos): 10 req/60s por IP+store
export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  prefix: 'kd:checkout',
})
