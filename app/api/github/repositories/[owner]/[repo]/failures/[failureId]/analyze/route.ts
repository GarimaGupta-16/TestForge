import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  extractGitHubIdentityId,
  findInstallationForAccount,
} from '@/lib/github/client'
import { resolveFailureSourceContext } from '@/lib/github/failure-context'
import { getAiAnalysisByFailureId, createAiAnalysis } from '@/lib/db/ai-analyses'
import { analyzeFailure } from '@/lib/ai/generator'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
    failureId: string
  }>
}

/**
 * POST /api/github/repositories/[owner]/[repo]/failures/[failureId]/analyze
 *
 * Server-only endpoint to execute grounded AI root-cause failure analysis
 * for a test failure belonging to the authenticated user's repository.
 * Enforces idempotency (returns cached analysis if already generated).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user session
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

    // 4. Resolve path params
    const { owner, repo, failureId } = await params
    if (!owner || !repo || !failureId) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Owner, repo, and failureId parameters are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const fullName = `${owner}/${repo}`

    // 5. Verify repository ownership
    const { data: repository } = await supabase
      .from('repositories')
      .select('id')
      .eq('user_id', user.id)
      .eq('full_name', fullName)
      .maybeSingle()

    if (!repository) {
      return NextResponse.json(
        { error: 'not_found', message: 'Repository not found or access denied.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 6. Fetch failure record
    const { data: failure } = await supabase
      .from('failures')
      .select('*')
      .eq('id', failureId)
      .eq('repository_id', repository.id)
      .maybeSingle()

    if (!failure) {
      return NextResponse.json(
        { error: 'not_found', message: 'Failure record not found for this repository.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 7. Idempotency Check: return existing analysis if already performed
    const existingAnalysis = await getAiAnalysisByFailureId(failure.id)
    if (existingAnalysis) {
      return NextResponse.json(
        {
          success: true,
          cached: true,
          aiAnalysis: existingAnalysis,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 8. Fetch test_result record if present
    let testResult: any = null
    if (failure.test_result_id) {
      const { data: trData } = await supabase
        .from('test_results')
        .select('*')
        .eq('id', failure.test_result_id)
        .maybeSingle()
      testResult = trData
    }

    // 9. Resolve GitHub source context for failure
    const sourceFilesMap = await resolveFailureSourceContext({
      installationId: existingInstallation.id,
      owner,
      repo,
      failure,
      testResult,
    })

    // 10. Execute grounded AI Failure Analysis
    const generationResult = await analyzeFailure({
      repositoryFullName: fullName,
      failure: {
        id: failure.id,
        title: failure.title,
        errorType: failure.error_type,
        errorMessage: failure.error_message,
        stackTrace: failure.stack_trace,
        componentAffected: failure.component_affected,
      },
      testResult,
      sourceFilesMap,
    })

    // 11. Persist validated result into public.ai_analyses table
    const savedRecord = await createAiAnalysis({
      failure_id: failure.id,
      root_cause: generationResult.analysis.rootCause,
      confidence_score: generationResult.analysis.confidenceScore,
      suggested_fix: generationResult.analysis.suggestedFix,
      analysis_json: generationResult.analysis as any,
    })

    return NextResponse.json(
      {
        success: true,
        cached: false,
        aiAnalysis: savedRecord,
        meta: generationResult.meta,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    const isTimeout =
      typeof error?.message === 'string' &&
      (error.message.toLowerCase().includes('time') ||
        error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('abort'))

    console.error('[API Route /failures/[failureId]/analyze] Error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })

    if (isTimeout) {
      return NextResponse.json(
        {
          error: 'timeout',
          message: 'AI failure analysis timed out while contacting the configured provider. Please try again.',
        },
        { status: 504, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { error: 'failure_analysis_failed', message: error?.message || 'Failed to analyze failure.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
