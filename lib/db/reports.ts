import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type ReportRow = Database['public']['Tables']['reports']['Row']
export type ReportInsert = Database['public']['Tables']['reports']['Insert']

/**
 * Server-side database helper for Reports table.
 * Not connected to UI components in Phase 2.
 */
export async function getReportsByRepository(repositoryId: string): Promise<ReportRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('generated_at', { ascending: false })

  if (error) {
    console.error(`Error fetching reports for repo ${repositoryId}:`, error)
    return []
  }

  return data || []
}

export async function createReport(payload: ReportInsert): Promise<ReportRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating report:', error)
    return null
  }

  return data
}
