import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type TestArtifactRow = Database['public']['Tables']['test_artifacts']['Row']
export type TestArtifactInsert = Database['public']['Tables']['test_artifacts']['Insert']

export async function createTestArtifact(payload: TestArtifactInsert, client?: any): Promise<TestArtifactRow | null> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_artifacts')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating test artifact entry:', error)
    return null
  }

  return data
}

export async function getTestArtifactsByResultId(testResultId: string, client?: any): Promise<TestArtifactRow[]> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_artifacts')
    .select('*')
    .eq('test_result_id', testResultId)

  if (error) {
    console.error(`Error fetching artifacts for result ${testResultId}:`, error)
    return []
  }

  return data || []
}
