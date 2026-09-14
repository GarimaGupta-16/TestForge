import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type TestRunRow = Database['public']['Tables']['test_runs']['Row']
export type TestRunInsert = Database['public']['Tables']['test_runs']['Insert']

/**
 * Server-side database helper for Test Runs table.
 * Not connected to UI components in Phase 2.
 */
export async function getTestRunsByRepository(repositoryId: string): Promise<TestRunRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('started_at', { ascending: false })

  if (error) {
    console.error(`Error fetching test runs for repo ${repositoryId}:`, error)
    return []
  }

  return data || []
}

export async function createTestRun(payload: TestRunInsert): Promise<TestRunRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('test_runs')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating test run:', error)
    return null
  }

  return data
}
