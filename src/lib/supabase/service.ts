import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses RLS, so it is server-only and used
 * only for server writes such as cost_log and events. A new client per call:
 * no module-level singleton, no session persistence.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
