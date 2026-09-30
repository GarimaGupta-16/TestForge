import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLatestAnalysisForRepo } from '@/lib/db/repositories'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
  }>
}

/**
 * GET /api/github/repositories/[owner]/[repo]/analysis
 *
 * Retrieves the latest persisted repository_analysis record for a repository
 * belonging to the authenticated user.
 * Sets Cache-Control: no-store.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    // 1. Authenticate Supabase user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 2. Resolve path params
    const { owner, repo } = await params
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Owner and repo parameters are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const fullName = `${owner}/${repo}`
    const analysisRecord = await getLatestAnalysisForRepo(user.id, fullName)

    if (!analysisRecord) {
      return NextResponse.json(
        { error: 'not_found', message: 'No analysis found for this repository.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(analysisRecord, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: any) {
    console.error('[API Route /api/github/repositories/[owner]/[repo]/analysis] Error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return NextResponse.json(
      { error: 'fetch_failed', message: 'An unexpected error occurred while fetching analysis.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
