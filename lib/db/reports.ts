import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type ReportRow = Database['public']['Tables']['reports']['Row']
export type ReportInsert = Database['public']['Tables']['reports']['Insert']

export type ReportWithRepo = ReportRow & {
  repository?: {
    id: string
    name: string
    full_name: string
  } | null
}

/**
 * Server-side database helper for Reports table.
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

/**
 * Fetches all reports for the authenticated user's connected repositories,
 * ordered by generated_at descending.
 */
export async function getUserReports(): Promise<ReportWithRepo[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: repositories, error: repoErr } = await supabase
    .from('repositories')
    .select('id, name, full_name')
    .eq('user_id', user.id)

  if (repoErr || !repositories || repositories.length === 0) {
    return []
  }

  const repoMap = new Map(repositories.map((r) => [r.id, r]))
  const repoIds = repositories.map((r) => r.id)

  const { data: reports, error: reportsErr } = await supabase
    .from('reports')
    .select('*')
    .in('repository_id', repoIds)
    .order('generated_at', { ascending: false })

  if (reportsErr || !reports) {
    return []
  }

  return reports.map((rep) => ({
    ...rep,
    repository: repoMap.get(rep.repository_id) || null,
  }))
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
