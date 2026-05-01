import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const defaultProjectId = 'vqkvqowvmdwabelpiiil'
const projectId = process.env.SUPABASE_PROJECT_ID || defaultProjectId

const outPath = resolve('src/lib/types/database.ts')
mkdirSync(dirname(outPath), { recursive: true })

const header = `// Generado con Supabase CLI (ver scripts/gen-supabase-types.mjs)\n` +
  `// Proyecto: ${projectId}\n` +
  `// Requiere SUPABASE_ACCESS_TOKEN (o estar logueado con 'supabase login').\n\n`

const types = execFileSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'supabase', 'gen', 'types', 'typescript', '--project-id', projectId],
  { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' },
)

writeFileSync(outPath, header + types, 'utf8')
console.log(`OK: ${outPath}`)

