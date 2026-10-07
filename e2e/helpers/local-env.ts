import { execSync } from 'node:child_process'

/**
 * Local Supabase credentials for e2e runs, read from `npx supabase status -o env`.
 *
 * Safety (T-16-06): e2e resets the database and writes fixtures with the
 * service-role key, so this refuses anything that is not the local stack.
 * The live project is never a valid target.
 */
export type LocalSupabaseEnv = {
  apiUrl: string
  anonKey: string
  serviceRoleKey: string
  dbUrl: string
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

export function parseStatusEnv(output: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    vars[match[1]] = value
  }
  return vars
}

export function assertLocalUrl(url: string, label = 'API_URL'): void {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    throw new Error(`E2E must run against local Supabase (${label} is not a URL)`)
  }
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`E2E must run against local Supabase (${label} host is ${hostname})`)
  }
}

let cached: LocalSupabaseEnv | null = null

export function localSupabaseEnv(): LocalSupabaseEnv {
  if (cached) return cached

  let output: string
  try {
    output = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error('Start local Supabase first: npx supabase start')
  }

  const vars = parseStatusEnv(output)
  const apiUrl = vars.API_URL
  const anonKey = vars.ANON_KEY
  const serviceRoleKey = vars.SERVICE_ROLE_KEY
  const dbUrl = vars.DB_URL
  if (!apiUrl || !anonKey || !serviceRoleKey || !dbUrl) {
    throw new Error('Start local Supabase first: npx supabase start')
  }

  assertLocalUrl(apiUrl, 'API_URL')
  assertLocalUrl(dbUrl.replace(/^postgres(ql)?:/, 'http:'), 'DB_URL')

  cached = { apiUrl, anonKey, serviceRoleKey, dbUrl }
  return cached
}
