import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { ExecutionAuthContext } from '@/lib/execution/auth-context'

/**
 * Creates a request-independent, RLS-preserving Supabase client for background tasks.
 *
 * Security & Authorization Rules:
 * 1. Does NOT use service-role key or bypass database Row-Level Security (RLS).
 * 2. Uses the authenticated user's access token explicitly via Authorization Bearer header.
 * 3. Disables browser session persistence and automatic token refresh behavior.
 * 4. Can safely execute after the Next.js HTTP request lifecycle has closed without calling cookies().
 */
export function createBackgroundClient(
  authContext: ExecutionAuthContext
): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase project URL or publishable key is missing from environment.')
  }

  if (!authContext.accessToken) {
    throw new Error('Cannot create background Supabase client: Access token is missing.')
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${authContext.accessToken}`,
      },
    },
  })
}
