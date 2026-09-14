import { createClient } from '@/lib/supabase/server'

export interface DatabaseHealthStatus {
  connected: boolean
  message: string
  timestamp: string
}

/**
 * Health check helper to verify Supabase connectivity.
 * Safe to call even if credentials are not configured.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const timestamp = new Date().toISOString()
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return {
      connected: false,
      message: 'Supabase credentials not configured in environment variables.',
      timestamp,
    }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)

    if (error) {
      return {
        connected: false,
        message: `Database query returned error: ${error.message}`,
        timestamp,
      }
    }

    return {
      connected: true,
      message: 'Successfully connected to Supabase PostgreSQL.',
      timestamp,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      connected: false,
      message: `Failed to connect to Supabase: ${message}`,
      timestamp,
    }
  }
}
