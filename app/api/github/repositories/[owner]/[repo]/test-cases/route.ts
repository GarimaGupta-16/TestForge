import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTestCasesForRepo } from '@/lib/db/test-cases'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
  }>
}

/**
 * GET /api/github/repositories/[owner]/[repo]/test-cases
 *
 * Fetches real persisted test cases for an authenticated user's repository.
 * Sets Cache-Control: no-store.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
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

    // 3. Fetch real test cases for user's repository
    const testCases = await getTestCasesForRepo(user.id, fullName)

    return NextResponse.json(
      {
        success: true,
        fullName,
        count: testCases.length,
        testCases,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    console.error('[API Route /api/github/repositories/[owner]/[repo]/test-cases] Error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return NextResponse.json(
      { error: 'fetch_failed', message: 'Failed to fetch test cases.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
