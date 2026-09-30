import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTestRunById } from '@/lib/db/test-runs'
import { getTestResultsByRunId } from '@/lib/db/test-results'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; runId: string }> }
) {
  const { owner, repo, runId } = await params
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

  const testRun = await getTestRunById(runId)
  if (!testRun || testRun.repository_id !== repository.id) {
    return NextResponse.json({ error: 'Test run not found' }, { status: 404 })
  }

  const results = await getTestResultsByRunId(testRun.id)

  // Fetch artifacts for results
  const resultIds = results.map((r) => r.id)
  let artifacts: any[] = []
  if (resultIds.length > 0) {
    const { data: artifactData } = await supabase
      .from('test_artifacts')
      .select('*')
      .in('test_result_id', resultIds)
    artifacts = artifactData || []
  }

  return NextResponse.json({
    testRun,
    results,
    artifacts,
  })
}
