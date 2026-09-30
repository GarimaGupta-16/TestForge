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

