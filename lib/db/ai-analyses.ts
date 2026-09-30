import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type AiAnalysisRow = Database['public']['Tables']['ai_analyses']['Row']
export type AiAnalysisInsert = Database['public']['Tables']['ai_analyses']['Insert']

/**
 * Server-side database helper for ai_analyses table.
 */
export async function getAiAnalysisByFailureId(failureId: string): Promise<AiAnalysisRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('failure_id', failureId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`Error fetching ai_analysis for failure ${failureId}:`, error)
    return null
  }

  return data
}

export async function createAiAnalysis(payload: AiAnalysisInsert): Promise<AiAnalysisRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_analyses')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating ai_analysis record:', error)
    return null
  }

  return data
}
