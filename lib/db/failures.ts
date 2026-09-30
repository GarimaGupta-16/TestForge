import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type FailureRow = Database['public']['Tables']['failures']['Row']
export type FailureInsert = Database['public']['Tables']['failures']['Insert']

/**
 * Server-side database helper for Failures table.
 * Not connected to UI components in Phase 2.
 */
export async function getFailuresByRepository(repositoryId: string, client?: any): Promise<FailureRow[]> {
  const supabase = client || (await createClient())
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

export async function createFailure(payload: FailureInsert, client?: any): Promise<FailureRow | null> {
  const supabase = client || (await createClient())
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

export type FailureVerificationState = {
  isVerified: boolean
  testCaseStatus: string | null
  latestTestResultStatus: string | null
  latestRunStatus: string | null
}

export type FailureWithDetails = FailureRow & {
  repository?: {
    id: string
    name: string
    full_name: string
  } | null
  test_result?: {
    id: string
    test_run_id: string
    test_case_id: string | null
    status: string
    duration_ms: number
    error_message: string | null
  } | null
  ai_analysis?: {
    id: string
    root_cause: string
    confidence_score: number
    suggested_fix: string
    analysis_json?: any
    created_at: string
  } | null
  ai_repair?: {
    id: string
    status: string
    diff_content: string
    explanation: string
    pull_request_url: string | null
    updated_at?: string
  } | null
  artifact?: {
    id: string
    file_name: string
    file_url: string
  } | null
  verificationState?: FailureVerificationState
}

/**
 * Server-side helper to determine failure verification state based on exact latest
 * test_case and test_result execution status.
 */
export async function getFailureVerificationState(failureId: string): Promise<FailureVerificationState> {
  const supabase = await createClient()

  const { data: failure } = await supabase
    .from('failures')
    .select('*')
    .eq('id', failureId)
    .maybeSingle()

  if (!failure) {
    return { isVerified: false, testCaseStatus: null, latestTestResultStatus: null, latestRunStatus: null }
  }

  let testCaseId: string | null = null
  if (failure.test_result_id) {
    const { data: tr } = await supabase
      .from('test_results')
      .select('test_case_id')
      .eq('id', failure.test_result_id)
      .maybeSingle()
    if (tr?.test_case_id) {
      testCaseId = tr.test_case_id
    }
  }

  if (!testCaseId) {
    const { data: tc } = await supabase
      .from('test_cases')
      .select('id')
      .eq('repository_id', failure.repository_id)
      .eq('title', failure.title)
      .limit(1)
      .maybeSingle()
    if (tc?.id) {
      testCaseId = tc.id
    }
  }

  if (!testCaseId) {
    const isVerified = failure.status === 'resolved'
    return { isVerified, testCaseStatus: null, latestTestResultStatus: null, latestRunStatus: null }
  }

  const { data: testCase } = await supabase
    .from('test_cases')
    .select('status')
    .eq('id', testCaseId)
    .maybeSingle()

  const { data: latestResults } = await supabase
    .from('test_results')
    .select('status, test_run_id')
    .eq('test_case_id', testCaseId)
    .order('created_at', { ascending: false })
    .limit(1)

  const latestResult = latestResults?.[0] || null

  let latestRunStatus: string | null = null
  if (latestResult?.test_run_id) {
    const { data: run } = await supabase
      .from('test_runs')
      .select('status')
      .eq('id', latestResult.test_run_id)
      .maybeSingle()
    latestRunStatus = run?.status || null
  }

  const isVerified =
    (testCase?.status === 'passing' && latestResult?.status === 'passed') ||
    failure.status === 'resolved'

  return {
    isVerified,
    testCaseStatus: testCase?.status || null,
    latestTestResultStatus: latestResult?.status || null,
    latestRunStatus,
  }
}

/**
 * Fetches all failures for the authenticated user's connected repositories,
 * ordered by detected_at descending, along with related metadata and execution verification state.
 */
export async function getUserFailures(): Promise<FailureWithDetails[]> {
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

  const repoIds = repositories.map((r) => r.id)
  const repoMap = new Map(repositories.map((r) => [r.id, r]))

  const { data: failures, error: failuresErr } = await supabase
    .from('failures')
    .select('*')
    .in('repository_id', repoIds)
    .order('detected_at', { ascending: false })

  if (failuresErr || !failures || failures.length === 0) {
    return []
  }

  const failureIds = failures.map((f) => f.id)
  const testResultIds = failures.map((f) => f.test_result_id).filter((id): id is string => Boolean(id))

  const { data: testResults } =
    testResultIds.length > 0
      ? await supabase.from('test_results').select('*').in('id', testResultIds)
      : { data: [] }

  const { data: aiAnalyses } = await supabase
    .from('ai_analyses')
    .select('*')
    .in('failure_id', failureIds)

  const { data: aiRepairs } = await supabase
    .from('ai_repairs')
    .select('*')
    .in('failure_id', failureIds)
    .order('updated_at', { ascending: false })

  const { data: testArtifacts } =
    testResultIds.length > 0
      ? await supabase.from('test_artifacts').select('*').in('test_result_id', testResultIds)
      : { data: [] }

  const { data: allTestCases } = await supabase
    .from('test_cases')
    .select('*')
    .in('repository_id', repoIds)

  const tcMapById = new Map((allTestCases || []).map((tc) => [tc.id, tc]))
  const tcMapByRepoTitle = new Map((allTestCases || []).map((tc) => [`${tc.repository_id}:${tc.title}`, tc]))

  const testCaseIds = (allTestCases || []).map((tc) => tc.id)
  const { data: latestResults } =
    testCaseIds.length > 0
      ? await supabase
          .from('test_results')
          .select('*')
          .in('test_case_id', testCaseIds)
          .order('created_at', { ascending: false })
      : { data: [] }

  const latestResultMap = new Map<string, NonNullable<typeof latestResults>[number]>()
  for (const tr of latestResults || []) {
    if (tr.test_case_id && !latestResultMap.has(tr.test_case_id)) {
      latestResultMap.set(tr.test_case_id, tr)
    }
  }

  const resultMap = new Map((testResults || []).map((tr) => [tr.id, tr]))
  const analysisMap = new Map((aiAnalyses || []).map((a) => [a.failure_id, a]))
  const repairMap = new Map<string, NonNullable<typeof aiRepairs>[number]>()
  for (const repair of aiRepairs ?? []) {
    if (!repairMap.has(repair.failure_id)) {
      repairMap.set(repair.failure_id, repair)
    }
  }
  const artifactMap = new Map((testArtifacts || []).map((ta) => [ta.test_result_id, ta]))

  return failures.map((f) => {
    const testResult = f.test_result_id ? resultMap.get(f.test_result_id) || null : null
    const artifact = f.test_result_id ? artifactMap.get(f.test_result_id) || null : null
    const aiAnalysis = analysisMap.get(f.id) || null
    const aiRepair = repairMap.get(f.id) || null

    const targetTc =
      (testResult?.test_case_id ? tcMapById.get(testResult.test_case_id) : null) ||
      tcMapByRepoTitle.get(`${f.repository_id}:${f.title}`) ||
      null

    const latestTcResult = targetTc ? latestResultMap.get(targetTc.id) || null : null

    const isVerified = Boolean(
      (targetTc?.status === 'passing' && latestTcResult?.status === 'passed') ||
        f.status === 'resolved' ||
        aiRepair?.status === 'applied'
    )

    const verificationState: FailureVerificationState = {
      isVerified,
      testCaseStatus: targetTc?.status || null,
      latestTestResultStatus: latestTcResult?.status || null,
      latestRunStatus: null,
    }

    return {
      ...f,
      repository: repoMap.get(f.repository_id) || null,
      test_result: testResult,
      ai_analysis: aiAnalysis,
      ai_repair: aiRepair,
      artifact,
      verificationState,
    }
  })
}

