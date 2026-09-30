import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTestCasesByRepository } from '@/lib/db/test-cases'
import { createTestRun, getTestRunsByRepository } from '@/lib/db/test-runs'
import { extractGitHubIdentityId, findInstallationForAccount, resolveRepositoryCommitInfo } from '@/lib/github/client'
import type { ExecutionAuthContext } from '@/lib/execution/auth-context'
import { runTestSuiteInBackground } from '@/lib/execution/test-runner'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params
  const fullName = `${owner}/${repo}`

  // 1. Authenticate user & capture request-independent ExecutionAuthContext
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return NextResponse.json({ error: 'Active user session required' }, { status: 401 })
  }

  const authContext: ExecutionAuthContext = {
    userId: user.id,
    accessToken: session.access_token,
  }

  // 2. Verify repository ownership
  const { data: repository, error: repoError } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', user.id)
    .eq('full_name', fullName)
    .maybeSingle()

  if (repoError || !repository) {
    return NextResponse.json({ error: 'Repository not found or access denied' }, { status: 404 })
  }

  // 3. Verify server-side GitHub installation and resolve branch + commit SHA
  const githubIdentityId = extractGitHubIdentityId(user)
  let branch = repository.default_branch || 'main'
  let commitSha = 'HEAD'

  if (githubIdentityId) {
    const inst = await findInstallationForAccount(Number(githubIdentityId))
    if (inst) {
      const commitInfo = await resolveRepositoryCommitInfo(inst.id, owner, repo)
      branch = commitInfo.branch
      commitSha = commitInfo.commitSha
    }
  }

  // 4. Read optional testCaseIds from body
  let requestedTestCaseIds: string[] | undefined
  try {
    const body = await request.json()
    if (Array.isArray(body?.testCaseIds)) {
      requestedTestCaseIds = body.testCaseIds
    }
  } catch {
    // Empty body is acceptable
  }

  // 5. Load and validate test cases
  const allTestCases = await getTestCasesByRepository(repository.id)

  let targetTestCases = allTestCases
  if (requestedTestCaseIds && requestedTestCaseIds.length > 0) {
    const validMap = new Map(allTestCases.map((tc) => [tc.id, tc]))
    const selectedCases = []
    for (const id of requestedTestCaseIds) {
      const found = validMap.get(id)
      if (!found) {
        return NextResponse.json(
          { error: `Requested test case ${id} does not belong to this repository` },
          { status: 400 }
        )
      }
      selectedCases.push(found)
    }
    targetTestCases = selectedCases
  }

  if (targetTestCases.length === 0) {
    return NextResponse.json({ error: 'No test cases available to execute' }, { status: 400 })
  }

  // 6. Create test_run record with status = "running"
  const testRun = await createTestRun({
    repository_id: repository.id,
    trigger_type: 'manual',
    branch,
    commit_sha: commitSha,
    status: 'running',
    total_tests: targetTestCases.length,
    passed_tests: 0,
    failed_tests: 0,
    skipped_tests: 0,
    duration_seconds: 0,
    started_at: new Date().toISOString(),
  })

  if (!testRun) {
    return NextResponse.json({ error: 'Failed to create test run record' }, { status: 500 })
  }

  // 7. Schedule non-blocking background execution using Next.js after()
  const targetUrl = repository.target_url || undefined

  after(async () => {
    try {
      await runTestSuiteInBackground({
        runId: testRun.id,
        repositoryId: repository.id,
        testCases: targetTestCases,
        targetUrl,
        authContext,
        branch,
        commitSha,
      })
    } catch (err) {
      console.error(`[POST /test-runs] Background execution error for run ${testRun.id}:`, err)
    }
  })

  // 8. Return HTTP 202 Accepted immediately with running testRun metadata
  return NextResponse.json({ testRun }, { status: 202 })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params
  const fullName = `${owner}/${repo}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: repository } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', user.id)
    .eq('full_name', fullName)
    .maybeSingle()

  if (!repository) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const runs = await getTestRunsByRepository(repository.id)
  return NextResponse.json({ testRuns: runs })
}
