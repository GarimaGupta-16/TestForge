import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type TestCaseRow = Database['public']['Tables']['test_cases']['Row']
export type TestCaseInsert = Database['public']['Tables']['test_cases']['Insert']

/**
 * Server-side database helper for Test Cases table.
 * Not connected to UI components in Phase 2.
 */
export async function getTestCasesByRepository(repositoryId: string): Promise<TestCaseRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('test_cases')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching test cases for repo ${repositoryId}:`, error)
    return []
  }

  return data || []
}

export async function createTestCase(payload: TestCaseInsert): Promise<TestCaseRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('test_cases')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating test case:', error)
    return null
  }

  return data
}
