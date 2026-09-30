import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type TestCaseRow = Database['public']['Tables']['test_cases']['Row']
export type TestCaseInsert = Database['public']['Tables']['test_cases']['Insert']

/**
 * Server-side database helper for Test Cases table.
 */
export async function getTestCasesForRepo(userId: string, fullName: string): Promise<TestCaseRow[]> {
  const supabase = await createClient()

  const { data: repo } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', userId)
    .eq('full_name', fullName)
    .maybeSingle()

  if (!repo) return []

  const { data, error } = await supabase
    .from('test_cases')
    .select('*')
    .eq('repository_id', repo.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching test cases for repo ${fullName}:`, error)
    return []
  }

  return data || []
}

export async function getTestCasesByRepository(repositoryId: string, client?: any): Promise<TestCaseRow[]> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_cases')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`Error fetching test cases for repo ${repositoryId}:`, error)
    return []
  }

  return data || []
}

export async function saveTestCasesBatch(
  userId: string,
  fullName: string,
  testCases: any[]
): Promise<TestCaseRow[]> {
  const supabase = await createClient()

  const { data: repo } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', userId)
    .eq('full_name', fullName)
    .maybeSingle()

  if (!repo) return []

  const existingCases = await getTestCasesByRepository(repo.id)
  const savedRows: TestCaseRow[] = []

  for (const tc of testCases) {
    const generationKey = tc.generationKey || `${tc.scenarioId || 'SCENARIO'}::${tc.category.toUpperCase()}`

    const metadataPayload = {
      objective: tc.objective,
      scenarioId: tc.scenarioId,
      generationKey,
      priority: tc.priority || 'HIGH',
      steps: tc.steps || [],
      expectedResults: tc.expectedResults || '',
      sourceEvidence: tc.sourceEvidence || [],
      groundingStatus: tc.groundingStatus || 'verified',
      automationCandidate: tc.automationCandidate ?? true,
    }

    const descriptionJson = JSON.stringify(metadataPayload)
    const formattedDescription = `${tc.objective || ''}\n\n<!-- TESTFORGE_META:${descriptionJson} -->`

    const existing = existingCases.find((row) => {
      if (row.description && row.description.includes(`"generationKey":"${generationKey}"`)) {
        return true
      }
      return row.title === tc.title
    })

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('test_cases')
        .update({
          title: tc.title,
          description: formattedDescription,
          category: tc.category || 'e2e',
          file_path: tc.targetSurface || '/',
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (!updateError && updated) {
        savedRows.push(updated)
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('test_cases')
        .insert({
          repository_id: repo.id,
          title: tc.title,
          description: formattedDescription,
          category: tc.category || 'e2e',
          file_path: tc.targetSurface || '/',
          status: 'pending',
          duration_ms: 0,
        })
        .select()
        .single()

      if (!insertError && inserted) {
        savedRows.push(inserted)
      }
    }
  }

  return savedRows
}

export async function updateTestCaseStatus(
  testCaseId: string,
  status: 'passing' | 'failing',
  durationMs: number,
  client?: any
): Promise<TestCaseRow | null> {
  const supabase = client || (await createClient())
  const { data, error } = await supabase
    .from('test_cases')
    .update({
      status,
      duration_ms: durationMs,
      last_run_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', testCaseId)
    .select()
    .single()

  if (error) {
    console.error(`Error updating test case status for ${testCaseId}:`, error)
    return null
  }

  return data
}

export async function updateTestCaseStepTarget(
  testCaseId: string,
  stepIndex: number,
  newTarget: string
): Promise<TestCaseRow | null> {
  const supabase = await createClient()

  const { data: tc, error: fetchErr } = await supabase
    .from('test_cases')
    .select('*')
    .eq('id', testCaseId)
    .single()

  if (fetchErr || !tc) {
    console.error(`Error fetching test case ${testCaseId} for step target update:`, fetchErr)
    return null
  }

  let meta: any = {}
  let objectivePrefix = tc.title || ''

  if (tc.description) {
    if (tc.description.includes('<!-- TESTFORGE_META:')) {
      const parts = tc.description.split('<!-- TESTFORGE_META:')
      objectivePrefix = parts[0].trim()
      try {
        meta = JSON.parse(parts[1].split('-->')[0].trim())
      } catch {}
    } else {
      try {
        meta = JSON.parse(tc.description)
      } catch {
        objectivePrefix = tc.description
      }
    }
  }

  const steps = meta.steps || []
  if (steps.length === 0) {
    steps.push({
      stepNumber: 1,
      action: newTarget.startsWith('/') ? 'assertion' : 'click',
      target: newTarget,
      expected: newTarget.startsWith('/') ? `URL includes ${newTarget}` : 'Navigation to target page',
    })
  } else if (steps[stepIndex]) {
    if (typeof steps[stepIndex] === 'string') {
      steps[stepIndex] = {
        stepNumber: stepIndex + 1,
        action: newTarget.startsWith('/') ? 'assertion' : 'click',
        target: newTarget,
        expected: newTarget.startsWith('/') ? `URL includes ${newTarget}` : undefined,
      }
    } else {
      steps[stepIndex].target = newTarget
      if (steps[stepIndex].action === 'assertion' || newTarget.startsWith('/')) {
        steps[stepIndex].expected = `URL includes ${newTarget}`
      }
    }
  } else {
    steps.push({
      stepNumber: stepIndex + 1,
      action: newTarget.startsWith('/') ? 'assertion' : 'click',
      target: newTarget,
      expected: newTarget.startsWith('/') ? `URL includes ${newTarget}` : undefined,
    })
  }

  meta.steps = steps
  const updatedDesc = `${objectivePrefix}\n\n<!-- TESTFORGE_META:${JSON.stringify(meta)} -->`

  const { data: updated, error: updateErr } = await supabase
    .from('test_cases')
    .update({
      description: updatedDesc,
      updated_at: new Date().toISOString(),
    })
    .eq('id', testCaseId)
    .select()
    .single()

  if (updateErr) {
    console.error(`Error updating step target for test case ${testCaseId}:`, updateErr)
    return null
  }

  return updated
}

/**
 * Fetches all test_cases for the authenticated user's connected repositories.
 */
export async function getUserTestCases(): Promise<TestCaseRow[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: repositories, error: repoErr } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', user.id)

  if (repoErr || !repositories || repositories.length === 0) {
    return []
  }

  const repoIds = repositories.map((r) => r.id)
  const { data: testCases, error: tcErr } = await supabase
    .from('test_cases')
    .select('*')
    .in('repository_id', repoIds)
    .order('created_at', { ascending: false })

  if (tcErr || !testCases) {
    return []
  }

  return testCases
}

