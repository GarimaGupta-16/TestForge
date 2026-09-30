import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type TestResultRow = Database['public']['Tables']['test_results']['Row']
export type TestResultInsert = Database['public']['Tables']['test_results']['Insert']

export async function createTestResult(payload: TestResultInsert, client?: any): Promise<TestResultRow | null> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_results')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating test result:', error)
    return null
  }

  return data
}

export async function getTestResultsByRunId(testRunId: string, client?: any): Promise<TestResultRow[]> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('test_run_id', testRunId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`Error fetching test results for run ${testRunId}:`, error)
    return []
  }

  return data || []
}
