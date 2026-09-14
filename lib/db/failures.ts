import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type FailureRow = Database['public']['Tables']['failures']['Row']
export type FailureInsert = Database['public']['Tables']['failures']['Insert']

/**
 * Server-side database helper for Failures table.
 * Not connected to UI components in Phase 2.
 */
export async function getFailuresByRepository(repositoryId: string): Promise<FailureRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('failures')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('detected_at', { ascending: false })

  if (error) {
    console.error(`Error fetching failures for repo ${repositoryId}:`, error)
    return []
  }

  return data || []
}

export async function createFailure(payload: FailureInsert): Promise<FailureRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('failures')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating failure entry:', error)
    return null
  }

  return data
}
