import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateRepositoryTargetUrl } from '@/lib/db/repositories'
import { validateTargetUrl } from '@/lib/utils/url-validator'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
  }>
}

/**
 * PATCH /api/github/repositories/[owner]/[repo]/target-url
 *
 * Secure server-side endpoint to update target application URL for an owned repository.
 * Enforces authenticated user ownership and target URL validation rules.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required.' },
        { status: 401 }
      )
    }

    const { owner, repo } = await params
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Owner and repo parameters are required.' },
        { status: 400 }
      )
    }

    const fullName = `${owner}/${repo}`

    const body = await request.json().catch(() => ({}))
    const rawTargetUrl = body?.targetUrl !== undefined ? body.targetUrl : null

    let finalTargetUrl: string | null = null
    if (rawTargetUrl !== null && typeof rawTargetUrl === 'string' && rawTargetUrl.trim() !== '') {
      const val = validateTargetUrl(rawTargetUrl)
      if (!val.isValid || !val.normalizedUrl) {
        return NextResponse.json(
          { error: 'invalid_url', message: val.error || 'Invalid target URL.' },
          { status: 400 }
        )
      }
      finalTargetUrl = val.normalizedUrl
    }

    const res = await updateRepositoryTargetUrl(user.id, fullName, finalTargetUrl)
    if (res.error) {
      return NextResponse.json(
        { error: 'update_failed', message: res.error },
        { status: res.error.includes('access denied') ? 404 : 400 }
      )
    }

    return NextResponse.json({
      success: true,
      repository: res.repository,
      targetUrl: res.repository?.target_url || null,
      message: res.repository?.target_url
        ? `Target Application URL configured: ${res.repository.target_url}`
        : 'Target Application URL cleared. TestForge will use MVP local fallback (http://localhost:5173).',
    })
  } catch (error: any) {
    console.error('[API Route /target-url] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: error?.message || 'Failed to update repository target URL.' },
      { status: 500 }
    )
  }
}
