import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseTestCaseMetadata } from '@/lib/execution/step-normalizer'
import { PlaywrightExecutor } from '@/lib/execution/playwright-executor'

export async function GET() {
  return POST()
}

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseKey)

    const failureId = '71cf4d00-27bc-4849-b2b8-22ada1921dd5'

    // 1. Fetch failure record
    const { data: failure, error: fErr } = await supabase
      .from('failures')
      .select('*')
      .eq('id', failureId)
      .maybeSingle()

    if (fErr || !failure) {
      return NextResponse.json({ error: 'failure_not_found', details: fErr }, { status: 404 })
    }

    // 2. Fetch existing AI Repair
    const { data: aiRepair, error: rErr } = await supabase
      .from('ai_repairs')
      .select('*')
      .eq('failure_id', failure.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (rErr || !aiRepair) {
      return NextResponse.json({ error: 'repair_not_found', details: rErr }, { status: 404 })
    }

    // 3. Revise Proposal to target assertion step correction
    const originalAssertion = '/create'
    const proposedAssertion = '/create-quiz'
    const testCaseId = 'bbf31741-e346-4e7b-a86d-afe3dcb5cc11'

    const correctedDiff = `Test case: ${testCaseId}\nStep: 1\n- assertion: "${originalAssertion}"\n+ assertion: "${proposedAssertion}"`
    const correctedExplanation =
      "Corrected test definition assertion target from '/create' to '/create-quiz'. Grounded in QuizLit src/App.jsx (<Route path='/create-quiz' element={<CreateQuiz />} />) and src/components/Home.jsx (navigateWithSound('/create-quiz')). Preserves locator '.quiz-card:has-text(\'Create Quiz\') button'."

    const { data: revisedRepair, error: revErr } = await supabase
      .from('ai_repairs')
      .update({
        diff_content: correctedDiff,
        explanation: correctedExplanation,
        status: 'drafted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', aiRepair.id)
      .select()
      .single()

    if (revErr || !revisedRepair) {
      return NextResponse.json({ error: 'repair_update_failed', details: revErr }, { status: 500 })
    }

    // 4. Fetch target test case
    let testCaseData: any = null
    if (failure.test_result_id) {
      const { data: trData } = await supabase
        .from('test_results')
        .select('test_case_id')
        .eq('id', failure.test_result_id)
        .maybeSingle()

      if (trData?.test_case_id) {
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
        .eq('repository_id', failure.repository_id)
        .eq('title', failure.title)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      testCaseData = tcByTitle
    }

    if (!testCaseData) {
      return NextResponse.json({ error: 'test_case_not_found' }, { status: 404 })
    }

    // 5. Update Step 1 assertion target to proposedAssertion in test_cases description while preserving Step 0 click locator
    const meta = parseTestCaseMetadata(testCaseData.description)
    let steps = meta.steps || []

    const clickLocator = ".quiz-card:has-text('Create Quiz') button"

    if (steps.length === 0) {
      steps = [
        { stepNumber: 1, action: 'click', target: clickLocator },
        { stepNumber: 2, action: 'assertion', target: proposedAssertion, expected: `URL includes ${proposedAssertion}` },
      ]
    } else {
      // Step 0: Preserve or set click locator
      if (typeof steps[0] === 'string') {
        steps[0] = { stepNumber: 1, action: 'click', target: clickLocator }
      } else {
        steps[0].target = clickLocator
      }

      // Step 1: Update assertion target to /create-quiz
      if (steps.length > 1) {
        if (typeof steps[1] === 'string') {
          steps[1] = { stepNumber: 2, action: 'assertion', target: proposedAssertion, expected: `URL includes ${proposedAssertion}` }
        } else {
          steps[1].target = proposedAssertion
          steps[1].expected = `URL includes ${proposedAssertion}`
        }
      } else {
        steps.push({ stepNumber: 2, action: 'assertion', target: proposedAssertion, expected: `URL includes ${proposedAssertion}` })
      }
    }

    meta.steps = steps
    const updatedMetaJson = JSON.stringify(meta, null, 2)
    const cleanDescription = (testCaseData.description || '').replace(/<!-- TESTFORGE_META:[\s\S]*?-->/, '').trim()
    const updatedDescription = `${cleanDescription}\n\n<!-- TESTFORGE_META:${updatedMetaJson} -->`

    const { data: updatedTestCase, error: tcUpdateErr } = await supabase
      .from('test_cases')
      .update({
        description: updatedDescription,
        updated_at: new Date().toISOString(),
      })
      .eq('id', testCaseData.id)
      .select()
      .single()

    if (tcUpdateErr || !updatedTestCase) {
      return NextResponse.json({ error: 'test_case_update_failed', details: tcUpdateErr }, { status: 500 })
    }

    // 6. REAL PLAYWRIGHT VERIFICATION RERUN
    const { data: testRun, error: trCreateErr } = await supabase
      .from('test_runs')
      .insert({
        repository_id: failure.repository_id,
        trigger_type: 'manual',
        branch: 'main',
        commit_sha: 'HEAD',
        status: 'running',
        total_tests: 1,
        passed_tests: 0,
        failed_tests: 0,
        skipped_tests: 0,
        duration_seconds: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (trCreateErr || !testRun) {
      return NextResponse.json({ error: 'test_run_create_failed', details: trCreateErr }, { status: 500 })
    }

    const executor = new PlaywrightExecutor()
    const rerunSummary = await executor.executeSuite([updatedTestCase])

    for (const res of rerunSummary.results) {
      await supabase.from('test_results').insert({
        test_run_id: testRun.id,
        test_case_id: res.testCaseId,
        title: res.title,
        file_path: res.filePath,
        status: res.status,
        duration_ms: res.durationMs,
        error_message: res.errorMessage || null,
        error_stack: res.errorStack || null,
      })

      if (res.status === 'passed') {
        await supabase
          .from('test_cases')
          .update({ status: 'passing', duration_ms: res.durationMs, last_run_at: new Date().toISOString() })
          .eq('id', res.testCaseId)

        await supabase
          .from('failures')
          .update({ status: 'resolved', updated_at: new Date().toISOString() })
          .eq('id', failure.id)
      } else {
        await supabase
          .from('test_cases')
          .update({ status: 'failing', duration_ms: res.durationMs, last_run_at: new Date().toISOString() })
          .eq('id', res.testCaseId)
      }
    }

    await supabase
      .from('test_runs')
      .update({
        status: rerunSummary.status,
        total_tests: rerunSummary.totalTests,
        passed_tests: rerunSummary.passedTests,
        failed_tests: rerunSummary.failedTests,
        skipped_tests: rerunSummary.skippedTests,
        duration_seconds: rerunSummary.durationSeconds,
        completed_at: new Date().toISOString(),
      })
      .eq('id', testRun.id)

    // 7. Status transition: ONLY if rerun passed
    const isRerunPassed = rerunSummary.status === 'passed'
    let finalRepair = revisedRepair

    if (isRerunPassed) {
      const { data: appliedRepair } = await supabase
        .from('ai_repairs')
        .update({
          status: 'applied',
          updated_at: new Date().toISOString(),
        })
        .eq('id', revisedRepair.id)
        .select()
        .single()

      if (appliedRepair) finalRepair = appliedRepair
    }

    return NextResponse.json({
      success: isRerunPassed,
      status: finalRepair?.status,
      originalAssertion,
      proposedAssertion,
      aiRepair: finalRepair,
      testRunId: testRun.id,
      rerun: rerunSummary,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Execution error' }, { status: 500 })
  }
}
