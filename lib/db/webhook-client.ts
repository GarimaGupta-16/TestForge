import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * WARNING: This client bypasses RLS using SUPABASE_SERVICE_ROLE_KEY and is ONLY for already-authenticated GitHub webhook processing.
 *
 * Security & Authorization Rules:
 * 1. Server-only access enforcement (`import 'server-only'`).
 * 2. Requires `SUPABASE_SERVICE_ROLE_KEY`. Does NOT fall back to publishable/anon keys.
 * 3. Fails explicitly on the server if `SUPABASE_SERVICE_ROLE_KEY` is missing.
 * 4. Must ONLY be invoked AFTER complete HMAC signature verification, push payload validation,
 *    and GitHub App installation verification.
 * 5. Secret keys are never logged, returned, or exposed to the browser.
 */
export function createWebhookPrivilegedClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('[Webhook Privileged Client] Server configuration error: NEXT_PUBLIC_SUPABASE_URL is missing.')
  }

  if (!serviceKey) {
    throw new Error('[Webhook Privileged Client] Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing.')
  }

  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
