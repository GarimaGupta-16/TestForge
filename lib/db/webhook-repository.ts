import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export interface WebhookRepositoryEligibilityResult {
  repository: {
    id: string
    userId: string
    fullName: string
    status: string
    targetUrl: string | null
  } | null
  testCaseCount: number
  isEligible: boolean
  reason: 'eligible' | 'repository_not_found' | 'target_url_missing' | 'no_test_cases' | 'not_eligible'
}

/**
 * Server-side helper to look up repository metadata and evaluate test execution eligibility
 * for incoming GitHub Webhook events.
 */
export async function checkWebhookRepositoryEligibility(
  fullName: string,
  client?: any
): Promise<WebhookRepositoryEligibilityResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { repository: null, testCaseCount: 0, isEligible: false, reason: 'repository_not_found' }
  }

  const supabase = client || createClient<Database>(supabaseUrl, supabaseKey)

  // 1. Fetch repository by full_name where status is active
  const { data: repo, error: repoErr } = await supabase
    .from('repositories')
    .select('id, user_id, full_name, status, target_url')
    .eq('full_name', fullName)
    .eq('status', 'active')
    .maybeSingle()

  if (repoErr || !repo) {
    return { repository: null, testCaseCount: 0, isEligible: false, reason: 'repository_not_found' }
  }

  const targetUrl = repo.target_url ? repo.target_url.trim() : null
  if (!targetUrl) {
    return {
      repository: {
        id: repo.id,
        userId: repo.user_id,
        fullName: repo.full_name,
        status: repo.status,
        targetUrl: null,
      },
      testCaseCount: 0,
      isEligible: false,
      reason: 'target_url_missing',
    }
  }

  // 2. Count test cases for this repository
  const { count, error: tcErr } = await supabase
    .from('test_cases')
    .select('*', { count: 'exact', head: true })
    .eq('repository_id', repo.id)

  const testCaseCount = count || 0

  if (tcErr || testCaseCount === 0) {
    return {
      repository: {
        id: repo.id,
        userId: repo.user_id,
        fullName: repo.full_name,
        status: repo.status,
        targetUrl,
      },
      testCaseCount: 0,
      isEligible: false,
      reason: 'no_test_cases',
    }
  }

  return {
    repository: {
      id: repo.id,
      userId: repo.user_id,
      fullName: repo.full_name,
      status: repo.status,
      targetUrl,
    },
    testCaseCount,
    isEligible: true,
    reason: 'eligible',
  }
}
