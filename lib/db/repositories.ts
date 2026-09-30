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

/**
 * Saves or updates a repository and creates a new repository_analysis record
 * for the authenticated user.
 */
export async function saveRepositoryAnalysisResult(
  userId: string,
  repoMetadata: {
    name: string
    fullName: string
    description?: string | null
    defaultBranch: string
    isPrivate: boolean
  },
  analysis: any
): Promise<{ repositoryId: string; analysisId: string } | null> {
  const supabase = await createClient()

  // 1. Find existing repository by user_id and full_name
  const { data: existingRepo } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', userId)
    .eq('full_name', repoMetadata.fullName)
    .maybeSingle()

  let repositoryId: string

  const framework = analysis.stack?.frontend && analysis.stack.frontend !== 'None' ? analysis.stack.frontend : 'Web'
  const language = analysis.primaryLanguage || 'TypeScript'

  if (existingRepo) {
    repositoryId = existingRepo.id
    const { error: updateError } = await supabase
      .from('repositories')
      .update({
        framework,
        language,
        description: repoMetadata.description || null,
        default_branch: repoMetadata.defaultBranch,
        is_private: repoMetadata.isPrivate,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', repositoryId)

    if (updateError) {
      console.error('Failed to update repository in database:', updateError)
    }
  } else {
    const { data: newRepo, error: insertError } = await supabase
      .from('repositories')
      .insert({
        user_id: userId,
        name: repoMetadata.name,
        full_name: repoMetadata.fullName,
        description: repoMetadata.description || null,
        default_branch: repoMetadata.defaultBranch,
        is_private: repoMetadata.isPrivate,
        framework,
        language,
        status: 'active',
      })
      .select('id')
      .single()

    if (insertError || !newRepo) {
      console.error('Failed to insert new repository into database:', insertError)
      return null
    }

    repositoryId = newRepo.id
  }

  // 1.5. Inspect existing latest repository_analysis for repository to preserve testPlan & aiMeta if present
  let finalTechStack = { ...analysis }
  const { data: previousAnalysis } = await supabase
    .from('repository_analysis')
    .select('tech_stack')
    .eq('repository_id', repositoryId)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (previousAnalysis && typeof previousAnalysis.tech_stack === 'object' && previousAnalysis.tech_stack !== null) {
    const prevStack = previousAnalysis.tech_stack as Record<string, any>
    if (prevStack.testPlan && !finalTechStack.testPlan) {
      finalTechStack.testPlan = prevStack.testPlan
    }
    if (prevStack.aiMeta && !finalTechStack.aiMeta) {
      finalTechStack.aiMeta = prevStack.aiMeta
    }
  }

  // 2. Create repository_analysis record
  const { data: analysisRecord, error: analysisError } = await supabase
    .from('repository_analysis')
    .insert({
      repository_id: repositoryId,
      status: 'completed',
      components_analyzed: analysis.metrics?.componentsAnalyzed || 0,
      api_routes_found: analysis.metrics?.apiRoutesFound || 0,
      e2e_coverage_percent: undefined,
      tech_stack: finalTechStack as any,
      summary: analysis.summary || 'Repository analysis completed.',
      analyzed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (analysisError || !analysisRecord) {
    console.error('Failed to insert repository_analysis record:', analysisError)
    return null
  }

  return {
    repositoryId,
    analysisId: analysisRecord.id,
  }
}

/**
 * Fetches the latest repository_analysis for a user's repository by full_name.
 */
export async function getLatestAnalysisForRepo(
  userId: string,
  fullName: string
): Promise<any | null> {
  const supabase = await createClient()

  const { data: repo } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', userId)
    .eq('full_name', fullName)
    .maybeSingle()

  if (!repo) {
    return null
  }

  const { data: analysis } = await supabase
    .from('repository_analysis')
    .select('*')
    .eq('repository_id', repo.id)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!analysis) {
    return null
  }

  return {
    id: analysis.id,
    repositoryId: analysis.repository_id,
    status: analysis.status,
    analyzedAt: analysis.analyzed_at,
    summary: analysis.summary,
    componentsAnalyzed: analysis.components_analyzed,
    apiRoutesFound: analysis.api_routes_found,
    analysis: analysis.tech_stack,
  }
}

/**
 * Merges a generated TestPlan into the existing repository_analysis record
 * under tech_stack.testPlan without overwriting existing analysis fields.
 */
export async function saveTestPlanToRepositoryAnalysis(
  userId: string,
  fullName: string,
  testPlan: any,
  meta?: {
    provider: string
    model: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    repairAttempted: boolean
  }
): Promise<{ repositoryId: string; analysisId: string } | null> {
  const supabase = await createClient()

  // 1. Find repository belonging to user
  const { data: repo } = await supabase
    .from('repositories')
    .select('id')
    .eq('user_id', userId)
    .eq('full_name', fullName)
    .maybeSingle()

  if (!repo) return null

  // 2. Fetch latest repository_analysis for repository
  const { data: existingAnalysis } = await supabase
    .from('repository_analysis')
    .select('*')
    .eq('repository_id', repo.id)
    .order('analyzed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!existingAnalysis) return null

  const currentTechStack = typeof existingAnalysis.tech_stack === 'object' && existingAnalysis.tech_stack !== null
    ? (existingAnalysis.tech_stack as Record<string, any>)
    : {}

  // Merge testPlan and AI generation metadata into tech_stack JSONB without overwriting existing analysis fields
  const updatedTechStack = {
    ...currentTechStack,
    testPlan,
    aiMeta: {
      provider: meta?.provider || 'gemini',
      model: meta?.model || 'gemini-2.5-flash',
      promptTokens: meta?.promptTokens,
      completionTokens: meta?.completionTokens,
      totalTokens: meta?.totalTokens,
      repairAttempted: meta?.repairAttempted || false,
      generatedAt: new Date().toISOString(),
    },
  }

  const { error: updateError } = await supabase
    .from('repository_analysis')
    .update({
      tech_stack: updatedTechStack as any,
    })
    .eq('id', existingAnalysis.id)

  if (updateError) {
    console.error('Failed to update repository_analysis with TestPlan:', updateError)
    return null
  }

  return {
    repositoryId: repo.id,
    analysisId: existingAnalysis.id,
  }
}

/**
 * Updates the target_url configuration for a repository owned by the authenticated user.
 */
export async function updateRepositoryTargetUrl(
  userId: string,
  fullName: string,
  rawTargetUrl: string | null
): Promise<{ repository: RepositoryRow | null; error: string | null }> {
  const { validateTargetUrl } = await import('@/lib/utils/url-validator')
  const supabase = await createClient()

  // Verify ownership
  const { data: existingRepo } = await supabase
    .from('repositories')
    .select('id, user_id')
    .eq('user_id', userId)
    .eq('full_name', fullName)
    .maybeSingle()

  if (!existingRepo) {
    return { repository: null, error: 'Repository not found or access denied.' }
  }

  let finalTargetUrl: string | null = null
  if (rawTargetUrl !== null && rawTargetUrl.trim() !== '') {
    const val = validateTargetUrl(rawTargetUrl)
    if (!val.isValid || !val.normalizedUrl) {
      return { repository: null, error: val.error || 'Invalid target URL.' }
    }
    finalTargetUrl = val.normalizedUrl
  }

  const { data: updated, error: updateError } = await supabase
    .from('repositories')
    .update({
      target_url: finalTargetUrl,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', existingRepo.id)
    .eq('user_id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('Error updating repository target_url:', updateError)
    return { repository: null, error: updateError.message }
  }

  return { repository: updated, error: null }
}

/**
 * Fetches all repository_analysis records for the authenticated user's repositories.
 */
export async function getUserRepositoryAnalyses(): Promise<any[]> {
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
  const { data: analyses, error } = await supabase
    .from('repository_analysis')
    .select('*')
    .in('repository_id', repoIds)

  if (error || !analyses) {
    return []
  }

  return analyses
}



