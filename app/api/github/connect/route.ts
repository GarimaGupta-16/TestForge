import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractGitHubIdentityId, findInstallationForAccount } from '@/lib/github/client'
import { getGitHubAppInstallUrl } from '@/lib/github/app'

/**
 * GET /api/github/connect
 *
 * Smart GitHub App Connect Repository handler.
 * Checks whether the authenticated user already has an active GitHub App installation.
 * - If an installation exists: redirects to GitHub installation settings URL so user can choose repositories.
 * - If no installation exists: redirects to GitHub App fresh installation page.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate server-side Supabase user
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. Extract verified GitHub account provider ID
    const githubIdentityId = extractGitHubIdentityId(user)
    if (!githubIdentityId) {
      return NextResponse.redirect(new URL('/repositories?github=verification_required', request.url))
    }

    const accountId = Number(githubIdentityId)
    if (isNaN(accountId) || accountId <= 0) {
      return NextResponse.redirect(new URL('/repositories?github=verification_required', request.url))
    }

    // 3. Search for existing active GitHub App installation
    const existingInstallation = await findInstallationForAccount(accountId)

    if (existingInstallation) {
      // Redirect user to GitHub's installation settings page so they can select repositories.
      // Upon saving on GitHub, GitHub redirects to /api/github/setup because "Redirect on update" is ON.
      return NextResponse.redirect(existingInstallation.htmlUrl)
    }


    // 4. If no installation exists, construct fresh installation URL
    const installUrl = getGitHubAppInstallUrl()
    if (!installUrl) {
      return NextResponse.redirect(new URL('/repositories?github=not_configured', request.url))
    }

    return NextResponse.redirect(installUrl)
  } catch (error) {
    console.error('[Connect Route] Unexpected error during connect flow', {
      message: typeof error === 'object' && error !== null && 'message' in error ? String(error.message).slice(0, 200) : null,
    })
    return NextResponse.redirect(new URL('/repositories?github=github_error', request.url))
  }
}
