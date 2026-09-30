import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractGitHubIdentityId, findInstallationForAccount, getRepositoryTree } from '@/lib/github/client'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
  }>
}

/**
 * GET /api/github/repositories/[owner]/[repo]/tree
 *
 * Retrieves default branch and Git repository tree for an owner/repo
 * accessible to the authenticated user's active GitHub App installation.
 * Sets Cache-Control: no-store for private code security.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 2. Extract verified GitHub account provider ID
    const githubIdentityId = extractGitHubIdentityId(user)
    if (!githubIdentityId) {
      return NextResponse.json(
        { error: 'verification_required', message: 'GitHub identity required.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const accountId = Number(githubIdentityId)
    if (isNaN(accountId) || accountId <= 0) {
      return NextResponse.json(
        { error: 'verification_required', message: 'Invalid GitHub account.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 3. Find active GitHub App installation
    const existingInstallation = await findInstallationForAccount(accountId)

    if (!existingInstallation) {
      return NextResponse.json(
        { error: 'not_installed', message: 'No active GitHub App installation.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 4. Resolve path params & search query params
    const { owner, repo } = await params
    const ref = request.nextUrl.searchParams.get('ref') || undefined

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Owner and repository parameters are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 5. Fetch repository tree using installation Octokit
    const result = await getRepositoryTree(existingInstallation.id, owner, repo, ref)

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: 'tree_fetch_failed', message: result.message || 'Failed to fetch repository tree.' },
        { status: result.status || 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(result.data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: any) {
    console.error('[API Route /api/github/repositories/[owner]/[repo]/tree] Error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return NextResponse.json(
      { error: 'github_error', message: 'An unexpected error occurred while fetching repository tree.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
