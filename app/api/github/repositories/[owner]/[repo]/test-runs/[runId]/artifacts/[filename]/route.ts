import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTestRunById } from '@/lib/db/test-runs'
import { readPrivateArtifact } from '@/lib/storage/artifact-storage'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string; runId: string; filename: string }> }
) {
  const { owner, repo, runId, filename } = await params
  const fullName = `${owner}/${repo}`

  // 1. Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Verify repository ownership
  const { data: repository } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', user.id)
    .eq('full_name', fullName)
    .maybeSingle()

  if (!repository) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  // 3. Verify test run belongs to repository
  const testRun = await getTestRunById(runId)
  if (!testRun || testRun.repository_id !== repository.id) {
    return NextResponse.json({ error: 'Test run not found' }, { status: 404 })
  }

  // 4. Read private artifact buffer
  const buffer = await readPrivateArtifact(runId, filename)
  if (!buffer) {
    return NextResponse.json({ error: 'Artifact file not found' }, { status: 404 })
  }

  // 5. Return image/png response
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
