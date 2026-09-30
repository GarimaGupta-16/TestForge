import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type AiRepairRow = Database['public']['Tables']['ai_repairs']['Row']
export type AiRepairInsert = Database['public']['Tables']['ai_repairs']['Insert']

/**
 * Server-side database helper for ai_repairs table.
 */
export async function getAiRepairByFailureId(failureId: string): Promise<AiRepairRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_repairs')
    .select('*')
    .eq('failure_id', failureId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`Error fetching ai_repair for failure ${failureId}:`, error)
    return null
  }

  return data
}

export async function createAiRepairProposal(payload: AiRepairInsert): Promise<AiRepairRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_repairs')
    .insert({
      ...payload,
      status: payload.status || 'drafted',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating ai_repair record:', error)
    return null
  }

  return data
}

export async function updateAiRepairStatus(
  repairId: string,
  status: string,
  extraFields?: Partial<AiRepairInsert>
): Promise<AiRepairRow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_repairs')
    .update({
      status,
      ...extraFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', repairId)
    .select()
    .single()

  if (error) {
    console.error(`Error updating ai_repair status for ${repairId}:`, error)
    return null
  }

  return data
}

/**
 * Fetches all applied ai_repairs records for the authenticated user's repositories.
 */
export async function getUserAppliedAiRepairs(): Promise<AiRepairRow[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: repositories } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', user.id)

  if (!repositories || repositories.length === 0) {
    return []
  }

  const repoIds = repositories.map((r) => r.id)

  const { data: failures } = await supabase
    .from('failures')
    .select('id')
    .in('repository_id', repoIds)

  if (!failures || failures.length === 0) {
    return []
  }

  const failureIds = failures.map((f) => f.id)

  const { data: repairs, error } = await supabase
    .from('ai_repairs')
    .select('*')
    .in('failure_id', failureIds)
    .eq('status', 'applied')

  if (error || !repairs) {
    return []
  }

  return repairs
}


