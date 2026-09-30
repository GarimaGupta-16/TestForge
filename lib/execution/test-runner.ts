import { PlaywrightExecutor } from '@/lib/execution/playwright-executor'
import type { SuiteExecutionSummary } from '@/lib/execution/types'
import type { ExecutionAuthContext } from '@/lib/execution/auth-context'
import { createBackgroundClient } from '@/lib/db/background-client'
import { updateTestRun, getTestRunById } from '@/lib/db/test-runs'
import { createTestResult } from '@/lib/db/test-results'
import { createTestArtifact } from '@/lib/db/test-artifacts'
import { createFailure } from '@/lib/db/failures'
import { getTestCasesByRepository, updateTestCaseStatus } from '@/lib/db/test-cases'
import { savePrivateArtifact } from '@/lib/storage/artifact-storage'

export interface RunTestSuiteOptions {
  runId: string
  repositoryId: string
  testCases: any[]
  targetUrl?: string
  authContext?: ExecutionAuthContext
  client?: any
  branch?: string
  commitSha?: string
}

/**
 * Server-only reusable test execution runner.
 * Executes a Playwright test suite and persists results using a request-independent
 * user-authenticated or explicitly injected server Supabase client.
 *
 * Security & RLS Rules:
 * 1. Uses explicit client if provided or createBackgroundClient(authContext) for user RLS.
 * 2. Does NOT depend on Next.js request-scoped cookies().
 * 3. Idempotent guard prevents duplicate execution if run is already terminal.
 * 4. Top-level try/catch ensures test_run is marked 'failed' if an unhandled exception occurs.
 */
export async function runTestSuiteInBackground(
  options: RunTestSuiteOptions
): Promise<SuiteExecutionSummary> {
  const client = options.client || (options.authContext ? createBackgroundClient(options.authContext) : null)

  if (!client) {
    throw new Error('[test-runner] Execution failed: Neither client nor authContext was provided.')
  }

  // 1. Idempotency Guard: Verify run is not already terminal
  const existingRun = await getTestRunById(options.runId, client)
  if (
    existingRun &&
    (existingRun.status === 'passed' ||
      existingRun.status === 'failed' ||
      existingRun.status === 'cancelled')
  ) {
    console.warn(
      `[test-runner] Run ${options.runId} is already in terminal state '${existingRun.status}'. Skipping re-execution.`
    )
    return {
      status: existingRun.status as any,
      totalTests: existingRun.total_tests,
      passedTests: existingRun.passed_tests,
      failedTests: existingRun.failed_tests,
      skippedTests: existingRun.skipped_tests,
      durationSeconds: existingRun.duration_seconds,
      results: [],
    }
  }

  const startTime = Date.now()

  try {
    // 2. Instantiate Playwright Executor with repository targetUrl
    const executor = new PlaywrightExecutor({ baseUrl: options.targetUrl })
    const summary = await executor.executeSuite(options.testCases)

    // 3. Process execution results, save artifacts & failures, update test_cases via background client
    for (const res of summary.results) {
      const testResult = await createTestResult(
        {
          test_run_id: options.runId,
          test_case_id: res.testCaseId,
          title: res.title,
          file_path: res.filePath,
          status: res.status,
          duration_ms: res.durationMs,
          error_message: res.errorMessage || null,
          error_stack: res.errorStack || null,
        },
        client
      )

      if (testResult && res.status === 'failed') {
        if (res.screenshotBuffer && res.artifactFileName) {
          const savedArtifact = await savePrivateArtifact(
            options.runId,
            res.artifactFileName,
            res.screenshotBuffer
          )

          await createTestArtifact(
            {
              test_result_id: testResult.id,
              type: 'screenshot',
              file_name: res.artifactFileName,
              file_url: savedArtifact.fileUrl,
              file_size_bytes: savedArtifact.sizeBytes,
            },
            client
          )
        }

        await createFailure(
          {
            repository_id: options.repositoryId,
            test_result_id: testResult.id,
            title: res.title,
            error_type: res.failureType || 'element_not_found',
            error_message: res.errorMessage || 'Test execution failed',
            stack_trace: res.errorStack || null,
            component_affected: res.filePath,
            status: 'open',
            severity: 'high',
          },
          client
        )

        await updateTestCaseStatus(res.testCaseId, 'failing', res.durationMs, client)
      } else if (res.status === 'passed') {
        await updateTestCaseStatus(res.testCaseId, 'passing', res.durationMs, client)
      }
    }

    // 4. Update test_run row to completed status
    await updateTestRun(
      options.runId,
      {
        status: summary.status,
        total_tests: summary.totalTests,
        passed_tests: summary.passedTests,
        failed_tests: summary.failedTests,
        skipped_tests: summary.skippedTests,
        duration_seconds: summary.durationSeconds,
        completed_at: new Date().toISOString(),
      },
      client
    )

    // 5. Update repository last_run_at and counts based on all repository test cases
    const updatedAllCases = await getTestCasesByRepository(options.repositoryId, client)
    const passingCount = updatedAllCases.filter((c) => c.status === 'passing').length
    const failingCount = updatedAllCases.filter((c) => c.status === 'failing').length

    await client
      .from('repositories')
      .update({
        last_run_at: new Date().toISOString(),
        test_count: updatedAllCases.length,
        passing_count: passingCount,
        failing_count: failingCount,
      })
      .eq('id', options.repositoryId)

    return summary
  } catch (err: any) {
    console.error(`[test-runner] Critical execution error for run ${options.runId}:`, err)

    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    await updateTestRun(
      options.runId,
      {
        status: 'failed',
        duration_seconds: durationSeconds,
        completed_at: new Date().toISOString(),
      },
      client
    ).catch(() => {})

    throw err
  }
}
