import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { checkWebhookRepositoryEligibility } from '@/lib/db/webhook-repository'
import { createWebhookPrivilegedClient } from '@/lib/db/webhook-client'
import { getTestCasesByRepository } from '@/lib/db/test-cases'
import { createTestRun, getTestRunByDeliveryId, getRunningTestRunForCommit } from '@/lib/db/test-runs'
import { runTestSuiteInBackground } from '@/lib/execution/test-runner'

/**
 * Verifies GitHub HMAC-SHA256 signature using timing-safe comparison.
 */
function verifyGitHubSignature(secret: string, body: string, receivedHeader: string): boolean {
  if (!receivedHeader || !receivedHeader.startsWith('sha256=')) {
    return false
  }

  const expectedDigest = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex')

  const expectedHeader = `sha256=${expectedDigest}`

  const receivedBuffer = Buffer.from(receivedHeader)
  const expectedBuffer = Buffer.from(expectedHeader)

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}

/**
 * POST /api/github/webhook
 *
 * Autonomous GitHub Webhook Dispatcher (Phase 8 Step 8.4.1)
 * 1. Validates HMAC-SHA256 signature using GITHUB_WEBHOOK_SECRET.
 * 2. Requires and reads x-github-delivery header for push events.
 * 3. Filters non-push, tag, and branch deletion events.
 * 4. Verifies installation active state if installation ID is present.
 * 5. Instantiate dedicated createWebhookPrivilegedClient ONLY after verification.
 * 6. Maps full_name to TestForge repository record and evaluates test execution eligibility.
 * 7. Checks for existing test_run with matching delivery_id (exact delivery idempotency).
 * 8. Checks for existing running test_run for same commit (concurrent push safety).
 * 9. Creates test_run record with delivery_id, trigger_type = 'push', status = 'running'.
 * 10. Schedules non-blocking background Playwright suite execution via Next.js after().
 * 11. Returns HTTP 202 Accepted with runId.
 */
export async function POST(request: NextRequest) {
  // 1. Read environment secret
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.error('[GitHub Webhook] Server configuration error: GITHUB_WEBHOOK_SECRET is missing')
    return NextResponse.json({ error: 'Webhook secret not configured on server' }, { status: 500 })
  }

  // 2. Read exact raw request body before parsing JSON
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (err) {
    console.error('[GitHub Webhook] Failed to read request body')
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // 3. Signature verification
  const signatureHeader = request.headers.get('x-hub-signature-256')
  if (!signatureHeader || !verifyGitHubSignature(secret, rawBody, signatureHeader)) {
    console.error('[GitHub Webhook] Invalid or missing HMAC signature')
    return NextResponse.json({ error: 'Invalid or missing signature' }, { status: 401 })
  }

  // 4. Validate GitHub Event Header
  const eventType = request.headers.get('x-github-event')

  if (eventType !== 'push') {
    console.log(`[GitHub Webhook] Ignored non-push event: ${eventType || 'unknown'}`)
    return NextResponse.json({ ok: true, accepted: false })
  }

  // 5. Require x-github-delivery header for push events
  const deliveryId = request.headers.get('x-github-delivery')
  if (!deliveryId || typeof deliveryId !== 'string' || deliveryId.trim() === '') {
    console.error('[GitHub Webhook] Missing or invalid x-github-delivery header')
    return NextResponse.json({ error: 'Missing x-github-delivery header' }, { status: 400 })
  }

  // 6. Parse and validate push event payload
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('[GitHub Webhook] Failed to parse JSON payload')
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const fullName = payload?.repository?.full_name
  const ref = payload?.ref
  const afterSha = payload?.after

  if (!fullName || typeof fullName !== 'string' || !ref || typeof ref !== 'string' || !afterSha || typeof afterSha !== 'string') {
    console.log('[GitHub Webhook] Push payload missing required fields')
    return NextResponse.json({ ok: true, accepted: false })
  }

  // 7. Filter branch deletion
  if (afterSha === '0000000000000000000000000000000000000000') {
    console.log(`[GitHub Webhook] Ignored branch deletion push for ${fullName} (${ref})`)
    return NextResponse.json({ ok: true, accepted: false })
  }

  // 8. Filter non-branch refs (e.g., tags)
  if (!ref.startsWith('refs/heads/')) {
    console.log(`[GitHub Webhook] Ignored non-branch push for ${fullName} (${ref})`)
    return NextResponse.json({ ok: true, accepted: false })
  }

  const branch = ref.replace('refs/heads/', '')
  const commitShaPrefix = afterSha.slice(0, 7)

  // 9. Optional GitHub installation verification if installation id provided
  const installationId = payload?.installation?.id
  if (typeof installationId === 'number' && installationId > 0) {
    try {
      const { getInstallationInfo } = await import('@/lib/github/client')
      const { installation, errorCode } = await getInstallationInfo(installationId)
      if (errorCode || !installation || !installation.isActive) {
        console.log(`[GitHub Webhook] Ineligible push: GitHub installation ${installationId} inactive or invalid`)
        return NextResponse.json({ ok: true, accepted: false, reason: 'not_eligible' })
      }
    } catch {
      // Continue to DB eligibility check if client import is unavailable
    }
  }

  // 10. Dedicated server-only privileged client instantiated ONLY after signature & event verification
  let webhookClient: ReturnType<typeof createWebhookPrivilegedClient>
  try {
    webhookClient = createWebhookPrivilegedClient()
  } catch (err: any) {
    console.error('[GitHub Webhook] Server configuration error:', err?.message || err)
    return NextResponse.json({ error: 'Webhook database client configuration error' }, { status: 500 })
  }

  // 11. Map repository and evaluate eligibility from database
  const eligibility = await checkWebhookRepositoryEligibility(fullName, webhookClient)

  if (!eligibility.isEligible || !eligibility.repository) {
    console.log('[GitHub Webhook] Push event ineligible for autonomous execution', {
      repository: fullName,
      branch,
      commit: commitShaPrefix,
      reason: eligibility.reason,
    })
    return NextResponse.json({ ok: true, accepted: false, reason: 'not_eligible' })
  }

  const repository = eligibility.repository

  // 12. Exact Delivery Idempotency Check
  const existingDeliveryRun = await getTestRunByDeliveryId(deliveryId, webhookClient)
  if (existingDeliveryRun) {
    console.log(`[GitHub Webhook] Duplicate delivery detected for run ${existingDeliveryRun.id}`)
    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        duplicate: true,
        runId: existingDeliveryRun.id,
      },
      { status: 200 }
    )
  }

  // 13. Concurrent Active Run Check for same commit/branch
  const activeRun = await getRunningTestRunForCommit(repository.id, branch, afterSha, webhookClient)
  if (activeRun) {
    console.log(`[GitHub Webhook] Concurrent active run detected for same commit: ${activeRun.id}`)
    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        duplicate: true,
        runId: activeRun.id,
      },
      { status: 200 }
    )
  }

  // 14. Load test cases for mapped repository
  const testCases = await getTestCasesByRepository(repository.id, webhookClient)
  if (testCases.length === 0) {
    console.log(`[GitHub Webhook] No test cases found for ${fullName}`)
    return NextResponse.json({ ok: true, accepted: false, reason: 'not_eligible' })
  }

  // 15. Create test_run record with delivery_id, status = 'running', trigger_type = 'push'
  let testRun = await createTestRun(
    {
      repository_id: repository.id,
      trigger_type: 'push',
      delivery_id: deliveryId,
      branch,
      commit_sha: afterSha,
      status: 'running',
      total_tests: testCases.length,
      passed_tests: 0,
      failed_tests: 0,
      skipped_tests: 0,
      duration_seconds: 0,
      started_at: new Date().toISOString(),
    },
    webhookClient
  )

  // Race condition fallback check if DB unique constraint prevented duplicate insert
  if (!testRun) {
    const racedDeliveryRun = await getTestRunByDeliveryId(deliveryId, webhookClient)
    if (racedDeliveryRun) {
      return NextResponse.json(
        {
          ok: true,
          accepted: true,
          duplicate: true,
          runId: racedDeliveryRun.id,
        },
        { status: 200 }
      )
    }

    const racedActiveRun = await getRunningTestRunForCommit(repository.id, branch, afterSha, webhookClient)
    if (racedActiveRun) {
      return NextResponse.json(
        {
          ok: true,
          accepted: true,
          duplicate: true,
          runId: racedActiveRun.id,
        },
        { status: 200 }
      )
    }

    console.error(`[GitHub Webhook] Failed to create test_run record for ${fullName}`)
    return NextResponse.json({ error: 'Failed to create test run record' }, { status: 500 })
  }

  console.log(`[GitHub Webhook] Created autonomous test run ${testRun.id} for ${fullName} (${branch}@${commitShaPrefix})`)

  // 16. Schedule non-blocking background execution via Next.js after()
  const targetUrl = repository.targetUrl || undefined

  after(async () => {
    try {
      await runTestSuiteInBackground({
        runId: testRun.id,
        repositoryId: repository.id,
        testCases,
        targetUrl,
        client: webhookClient,
        branch,
        commitSha: afterSha,
      })
    } catch (err) {
      console.error(`[GitHub Webhook] Background execution error for run ${testRun.id}:`, err)
    }
  })

  // 17. Return HTTP 202 Accepted with running testRun metadata
  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      runStarted: true,
      runId: testRun.id,
    },
    { status: 202 }
  )
}
