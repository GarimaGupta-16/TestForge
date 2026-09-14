import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

export type RepositoryRow = Database['public']['Tables']['repositories']['Row']
export type RepositoryInsert = Database['public']['Tables']['repositories']['Insert']

/**
 * Server-side database helper for Repositories table.
 * Not connected to UI components in Phase 2.
 */
export async function getRepositories(): Promise<RepositoryRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching repositories from database:', error)
    return []
  }

  return data || []
}

export async function getRepositoryById(id: string): Promise<RepositoryRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Error fetching repository ${id}:`, error)
    return null
  }

  return data
}

export async function createRepository(payload: RepositoryInsert): Promise<RepositoryRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repositories')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Error creating repository:', error)
    return null
  }

  return data
}
