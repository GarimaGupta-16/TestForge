import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInstallationInfo, extractGitHubIdentityId } from '@/lib/github/client'

/**
 * GET /api/github/setup
 *
 * Secure server-side GitHub App installation setup & validation callback handler.
 * Validates installation server-side using Octokit and verifies that the installation's
 * GitHub account ID matches the authenticated Supabase user's GitHub provider_id.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // A. Authenticate using existing server-side Supabase client
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // B & C. Parse and strictly validate installation_id
  const searchParams = request.nextUrl.searchParams
  const installationIdRaw = searchParams.get('installation_id')

  if (!installationIdRaw || !/^\d+$/.test(installationIdRaw)) {
    return NextResponse.redirect(new URL('/repositories?github=invalid_installation', request.url))
  }

  const installationId = Number(installationIdRaw)
  if (installationId <= 0) {
    return NextResponse.redirect(new URL('/repositories?github=invalid_installation', request.url))
  }

  // D & E. Retrieve installation information via Octokit App authentication
  const { installation: installationInfo, errorCode } = await getInstallationInfo(installationId)

  if (errorCode === 'unconfigured') {
    return NextResponse.redirect(new URL('/repositories?github=not_configured', request.url))
  }
  if (errorCode === 'not_found') {
    return NextResponse.redirect(new URL('/repositories?github=invalid_installation', request.url))
  }
  if (errorCode === 'unauthorized') {
    return NextResponse.redirect(new URL('/repositories?github=github_auth_error', request.url))
  }
  if (errorCode === 'forbidden') {
    return NextResponse.redirect(new URL('/repositories?github=github_access_denied', request.url))
  }
  if (errorCode === 'error' || !installationInfo) {
    return NextResponse.redirect(new URL('/repositories?github=github_error', request.url))
  }

  // F. Verify installation is active and not suspended
  if (!installationInfo.isActive) {
    return NextResponse.redirect(new URL('/repositories?github=installation_inactive', request.url))
  }

  // G. Extract verified GitHub provider account ID from Supabase session
  const githubIdentityId = extractGitHubIdentityId(user)
  if (!githubIdentityId) {
    // User is logged in via email/password or lacks a linked GitHub OAuth identity
    return NextResponse.redirect(new URL('/repositories?github=verification_required', request.url))
  }

  // H. Compare stable GitHub numerical account IDs
  if (String(githubIdentityId) !== String(installationInfo.accountId)) {
    return NextResponse.redirect(new URL('/repositories?github=identity_mismatch', request.url))
  }

  // I. Successful installation validation
  return NextResponse.redirect(new URL('/repositories?github=connected', request.url))
}
