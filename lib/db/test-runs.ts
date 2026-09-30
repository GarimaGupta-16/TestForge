import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type TestRunRow = Database['public']['Tables']['test_runs']['Row']
export type TestRunInsert = Database['public']['Tables']['test_runs']['Insert']
export type TestRunUpdate = Database['public']['Tables']['test_runs']['Update']

/**
 * Server-side database helper for Test Runs table.
 */
export async function getTestRunsByRepository(repositoryId: string, client?: any): Promise<TestRunRow[]> {
  const supabase = client || (await createClient())
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

export async function getTestRunById(runId: string, client?: any): Promise<TestRunRow | null> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

export async function getTestRunByDeliveryId(deliveryId: string, client?: any): Promise<TestRunRow | null> {
  if (!deliveryId) return null
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('delivery_id', deliveryId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

export async function getRunningTestRunForCommit(
  repositoryId: string,
  branch: string,
  commitSha: string,
  client?: any
): Promise<TestRunRow | null> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('repository_id', repositoryId)
    .eq('branch', branch)
    .eq('commit_sha', commitSha)
    .eq('trigger_type', 'push')
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

export async function createTestRun(payload: TestRunInsert, client?: any): Promise<TestRunRow | null> {
  const supabase = client || (await createClient())
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

export async function updateTestRun(runId: string, payload: TestRunUpdate, client?: any): Promise<TestRunRow | null> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_runs')
    .update(payload)
    .eq('id', runId)
    .select()
    .single()

  if (error) {
    console.error(`Error updating test run ${runId}:`, error)
    return null
  }

  return data
}

export type TestRunWithRepo = TestRunRow & {
  repository?: {
    id: string
    name: string
    full_name: string
  } | null
}

/**
 * Fetches test_runs for the authenticated user's connected repositories,
 * optionally filtered by repositoryId, ordered by started_at descending.
 */
export async function getUserTestRuns(repositoryId?: string): Promise<TestRunWithRepo[]> {
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
  let targetRepoIds = repositories.map((r) => r.id)

  if (repositoryId) {
    if (!targetRepoIds.includes(repositoryId)) {
      return []
    }
    targetRepoIds = [repositoryId]
  }

  const { data: runs, error: runsErr } = await supabase
    .from('test_runs')
    .select('*')
    .in('repository_id', targetRepoIds)
    .order('started_at', { ascending: false })

  if (runsErr || !runs) {
    return []
  }

  return runs.map((run) => ({
    ...run,
    repository: repoMap.get(run.repository_id) || null,
  }))
}

