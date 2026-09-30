import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

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
 * Secure GitHub Webhook Receiver (Phase 8 Step 8.1)
 * Validates HMAC-SHA256 signature using GITHUB_WEBHOOK_SECRET.
 * Accepts push events on branches and filters out non-push, tag, and deletion events.
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

  // 5. Parse and validate push event payload
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error('[GitHub Webhook] Failed to parse JSON payload')
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const fullName = payload?.repository?.full_name
  const ref = payload?.ref
  const after = payload?.after

  if (!fullName || typeof fullName !== 'string' || !ref || typeof ref !== 'string' || !after || typeof after !== 'string') {
    console.log('[GitHub Webhook] Push payload missing required fields')
    return NextResponse.json({ ok: true, accepted: false })
  }

  // 6. Filter branch deletion
  if (after === '0000000000000000000000000000000000000000') {
    console.log(`[GitHub Webhook] Ignored branch deletion push for ${fullName} (${ref})`)
    return NextResponse.json({ ok: true, accepted: false })
  }

  // 7. Filter non-branch refs (e.g., tags)
  if (!ref.startsWith('refs/heads/')) {
    console.log(`[GitHub Webhook] Ignored non-branch push for ${fullName} (${ref})`)
    return NextResponse.json({ ok: true, accepted: false })
  }

  const branch = ref.replace('refs/heads/', '')
  const commitShaPrefix = after.slice(0, 7)

  // Minimal safe log (NO secrets, signatures, keys, or tokens logged)
  console.log('[GitHub Webhook] Accepted push event', {
    repository: fullName,
    branch,
    commit: commitShaPrefix,
  })

  // 8. Return neutral accepted response
  return NextResponse.json({
    ok: true,
    event: 'push',
    accepted: true,
  })
}
