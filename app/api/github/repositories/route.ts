import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractGitHubIdentityId, findInstallationForAccount, listInstallationRepositories } from '@/lib/github/client'

/**
 * GET /api/github/repositories
 *
 * Secure server-side endpoint for retrieving real GitHub repositories accessible
 * to the user's active GitHub App installation.
 *
 * Security & Authorization Rules:
 * 1. Must require an authenticated Supabase session.
 * 2. Resolves installation server-side via Supabase user -> GitHub provider_id -> installation account.id.
 * 3. Does NOT trust or accept any client-supplied `installation_id` parameter.
 * 4. Does NOT expose installation tokens, JWTs, secrets, or internal installation ID in browser responses.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Authenticate Supabase session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', repositories: [] },
        { status: 401 }
      )
    }

    // 2. Extract verified GitHub account provider ID
    const githubIdentityId = extractGitHubIdentityId(user)
    if (!githubIdentityId) {
      return NextResponse.json(
        { error: 'verification_required', repositories: [] },
        { status: 404 }
      )
    }

    const accountId = Number(githubIdentityId)
    if (isNaN(accountId) || accountId <= 0) {
      return NextResponse.json(
        { error: 'verification_required', repositories: [] },
        { status: 404 }
      )
    }

    // 3. Find active GitHub App installation for account
    const existingInstallation = await findInstallationForAccount(accountId)

    if (!existingInstallation) {
      return NextResponse.json(
        { error: 'not_installed', repositories: [] },
        { status: 404 }
      )
    }

    // 4. Fetch repositories using Octokit installation client with pagination
    const repositories = await listInstallationRepositories(existingInstallation.id)

    // 4.5 Fetch target_url from database for this user's repositories
    const { data: dbRepos } = await supabase
      .from('repositories')
      .select('full_name, target_url')
      .eq('user_id', user.id)

    const targetUrlMap = new Map((dbRepos || []).map((r) => [r.full_name, r.target_url]))

    const enrichedRepositories = repositories.map((repo) => ({
      ...repo,
      targetUrl: targetUrlMap.get(repo.fullName) || null,
    }))

    // 5. Return safe repository metadata list (excluding internal installation ID and secrets)
    return NextResponse.json({ repositories: enrichedRepositories }, { status: 200 })
  } catch (error: any) {
    console.error('[API Route /api/github/repositories] Unexpected error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return NextResponse.json(
      { error: 'github_error', repositories: [] },
      { status: 502 }
    )
  }
}
