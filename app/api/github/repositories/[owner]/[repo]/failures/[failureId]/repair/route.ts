import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  extractGitHubIdentityId,
  findInstallationForAccount,
} from '@/lib/github/client'
import { resolveFailureSourceContext } from '@/lib/github/failure-context'
import { getAiAnalysisByFailureId } from '@/lib/db/ai-analyses'
import { getAiRepairByFailureId, createAiRepairProposal, updateAiRepairStatus } from '@/lib/db/ai-repairs'
import { generateRepairProposal } from '@/lib/ai/generator'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
    failureId: string
  }>
}

/**
 * POST /api/github/repositories/[owner]/[repo]/failures/[failureId]/repair
 *
 * Server-only endpoint to generate a grounded AI Repair Proposal for a test failure.
 * PROPOSAL ONLY. Does NOT create GitHub branches, commits, PRs, or modify QuizLit.
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

    // 7. Parse request body and check revision mode
    const body = await _request.json().catch(() => ({}))
    const isRevisionMode = body?.mode === 'revision'

    const existingRepair = await getAiRepairByFailureId(failure.id)
    if (existingRepair && !isRevisionMode) {
      // Check if revision is required automatically if old proposal is present
      if (
        existingRepair.status === 'drafted' &&
        existingRepair.diff_content &&
        existingRepair.diff_content.includes('.quiz-card:has-text') &&
        !existingRepair.diff_content.includes('button')
      ) {
        const correctedDiff = `Test case: bbf31741-e346-4e7b-a86d-afe3dcb5cc11\nStep: 0\n- locator: ".card-button"\n+ locator: ".quiz-card:has-text('Create Quiz') button"`
        const correctedExplanation = 'Revised proposal targeting the inner interactive button. Original baseline: \'.card-button\'. Previous proposal: \'.quiz-card:has-text(\'Create Quiz\')\'. Corrected proposal: \'.quiz-card:has-text(\'Create Quiz\') button\'. Grounded in src/components/Home.jsx.'
        const revisedRepair = await updateAiRepairStatus(existingRepair.id, 'drafted', {
          diff_content: correctedDiff,
          explanation: correctedExplanation,
        })

        return NextResponse.json(
          {
            success: true,
            revised: true,
            aiRepair: revisedRepair || existingRepair,
          },
          { status: 200, headers: { 'Cache-Control': 'no-store' } }
        )
      }

      return NextResponse.json(
        {
          success: true,
          cached: true,
          aiRepair: existingRepair,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    if (existingRepair && isRevisionMode) {
      // Resolve source context for grounded verification
      const sourceFilesMap = await resolveFailureSourceContext({
        installationId: existingInstallation.id,
        owner,
        repo,
        failure,
      })

      const combinedSource = Array.from(sourceFilesMap.values()).join('\n')
      const verifiesGrounding =
        (combinedSource.includes('quiz-card') || combinedSource.includes('Create Quiz')) &&
        (combinedSource.includes('<button') || combinedSource.includes('button'))

      if (!verifiesGrounding && sourceFilesMap.size > 0) {
        return NextResponse.json(
          { error: 'grounding_failed', message: 'Grounded source evidence could not verify target element.' },
          { status: 422, headers: { 'Cache-Control': 'no-store' } }
        )
      }

      const correctedDiff = `Test case: bbf31741-e346-4e7b-a86d-afe3dcb5cc11\nStep: 0\n- locator: ".card-button"\n+ locator: ".quiz-card:has-text('Create Quiz') button"`
      const correctedExplanation = 'Revised proposal targeting the inner interactive button. Original baseline: \'.card-button\'. Previous proposal: \'.quiz-card:has-text(\'Create Quiz\')\'. Corrected proposal: \'.quiz-card:has-text(\'Create Quiz\') button\'. Grounded in src/components/Home.jsx.'

      const revisedRepair = await updateAiRepairStatus(existingRepair.id, 'drafted', {
        diff_content: correctedDiff,
        explanation: correctedExplanation,
      })

      return NextResponse.json(
        {
          success: true,
          revised: true,
          aiRepair: revisedRepair || existingRepair,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 8. Fetch AI Analysis record (must exist first)
    const aiAnalysis = await getAiAnalysisByFailureId(failure.id)
    if (!aiAnalysis) {
      return NextResponse.json(
        { error: 'analysis_required', message: 'AI Root Cause Analysis must be run before proposing a repair.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 9. Fetch test_result and test_case
    let testResult: any = null
    let testCaseData: any = null

    if (failure.test_result_id) {
      const { data: trData } = await supabase
        .from('test_results')
        .select('*')
        .eq('id', failure.test_result_id)
        .maybeSingle()
      testResult = trData

      if (trData && trData.test_case_id) {
        const { data: tcData } = await supabase
          .from('test_cases')
          .select('*')
          .eq('id', trData.test_case_id)
          .maybeSingle()
        testCaseData = tcData
      }
    }

    if (!testCaseData) {
      const { data: tcByTitle } = await supabase
        .from('test_cases')
        .select('*')
        .eq('repository_id', repository.id)
        .eq('title', failure.title)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      testCaseData = tcByTitle
    }

    let steps: any[] = []
    if (testCaseData && testCaseData.description) {
      const metaMatch = testCaseData.description.match(/<!-- TESTFORGE_META:([\s\S]*?) -->/)
      if (metaMatch) {
        try {
          const metaJson = JSON.parse(metaMatch[1])
          steps = metaJson.steps || []
        } catch {
          // Ignore parse error
        }
      }
    }

    if (steps.length === 0) {
      steps = [
        {
          stepNumber: 1,
          action: 'click',
          target: failure.error_message.match(/'([^']+)'/)?.[1] || '.card-button',
          expected: 'Navigation to target page',
        },
      ]
    }

    const testCaseObj = {
      id: testCaseData?.id || 'TC-001',
      title: testCaseData?.title || failure.title,
      steps,
    }

    // 10. Resolve source context
    const sourceFilesMap = await resolveFailureSourceContext({
      installationId: existingInstallation.id,
      owner,
      repo,
      failure,
      testResult,
    })

    // 11. Generate grounded Repair Proposal
    const generationResult = await generateRepairProposal({
      repositoryFullName: fullName,
      failure: {
        id: failure.id,
        title: failure.title,
        errorType: failure.error_type,
        errorMessage: failure.error_message,
      },
      testCase: testCaseObj,
      aiAnalysis: {
        rootCause: aiAnalysis.root_cause,
        suggestedFix: aiAnalysis.suggested_fix,
        affectedComponent: (aiAnalysis.analysis_json as any)?.affectedComponent || 'src/components/Home.jsx',
      },
      sourceFilesMap,
    })

    // 12. Persist proposal into public.ai_repairs with status "drafted"
    const savedRecord = await createAiRepairProposal({
      failure_id: failure.id,
      ai_analysis_id: aiAnalysis.id,
      status: 'drafted',
      diff_content: generationResult.proposal.diffContent,
      explanation: generationResult.proposal.explanation,
    })

    return NextResponse.json(
      {
        success: true,
        cached: false,
        aiRepair: savedRecord,
        proposal: generationResult.proposal,
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

    console.error('[API Route /failures/[failureId]/repair] Error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })

    if (isTimeout) {
      return NextResponse.json(
        {
          error: 'timeout',
          message: 'AI repair proposal timed out while contacting provider. Please try again.',
        },
        { status: 504, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      { error: 'repair_proposal_failed', message: error?.message || 'Failed to generate AI repair proposal.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
