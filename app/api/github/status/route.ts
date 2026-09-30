import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkGitHubAppConfiguration } from '@/lib/github/client'
import { getGitHubAppInstallUrl } from '@/lib/github/app'
import type { GitHubStatusApiResponse } from '@/lib/github/types'

/**
 * Server API boundary for GitHub App configuration status check.
 * Strictly requires an authenticated Supabase session.
 * Does NOT accept user_id, installation_id, or token parameters from the client.
 */
export async function GET() {
  const supabase = await createClient()

  // Authenticate user via server session
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      {
        authenticated: false,
        configured: false,
        state: 'unconfigured',
        message: 'Unauthorized: Authentication required.',
        installUrl: null,
      } satisfies GitHubStatusApiResponse,
      { status: 401 }
    )
  }

  const appStatus = checkGitHubAppConfiguration()
  const installUrl = appStatus.isConfigured ? getGitHubAppInstallUrl() : null

  return NextResponse.json({
    authenticated: true,
    configured: appStatus.isConfigured,
    state: appStatus.state,
    message: appStatus.message,
    installUrl,
  } satisfies GitHubStatusApiResponse)
}
