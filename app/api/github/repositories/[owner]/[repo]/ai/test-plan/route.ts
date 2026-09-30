import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  extractGitHubIdentityId,
  findInstallationForAccount,
  getRepositoryTree,
  getRepositoryFileContent,
} from '@/lib/github/client'
import { getLatestAnalysisForRepo, saveTestPlanToRepositoryAnalysis } from '@/lib/db/repositories'
import { generateTestPlan } from '@/lib/ai/generator'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
  }>
}

/**
 * POST /api/github/repositories/[owner]/[repo]/ai/test-plan
 *
 * Server-only endpoint to generate, validate, and persist a grounded, structured
 * TestPlan for an analyzed repository belonging to the authenticated user.
 * Sets Cache-Control: no-store.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    // 1. Authenticate Supabase user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 2. Extract verified GitHub account provider ID
    const githubIdentityId = extractGitHubIdentityId(user)
    if (!githubIdentityId) {
      return NextResponse.json(
        { error: 'verification_required', message: 'GitHub identity required.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const accountId = Number(githubIdentityId)
    if (isNaN(accountId) || accountId <= 0) {
      return NextResponse.json(
        { error: 'verification_required', message: 'Invalid GitHub account.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 3. Find active GitHub App installation
    const existingInstallation = await findInstallationForAccount(accountId)
    if (!existingInstallation) {
      return NextResponse.json(
        { error: 'not_installed', message: 'No active GitHub App installation.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 4. Resolve path params
    const { owner, repo } = await params
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'Owner and repo parameters are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const fullName = `${owner}/${repo}`

    // 5. Fetch latest persisted analysis for repository
    const latestAnalysisRecord = await getLatestAnalysisForRepo(user.id, fullName)
    if (!latestAnalysisRecord || !latestAnalysisRecord.analysis) {
      return NextResponse.json(
        { error: 'analysis_required', message: 'Repository must be analyzed before generating a test plan.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const analysis = latestAnalysisRecord.analysis

    // 6. Bounded dependency-aware source context selection (max 8 files, max 500 KB per file)
    const treeResult = await getRepositoryTree(existingInstallation.id, owner, repo)
    const treePathSet = new Set<string>()
    if (treeResult.success && treeResult.data) {
      treeResult.data.tree.forEach((e: any) => treePathSet.add(e.path))
    }

    const sourceFilesMap = new Map<string, string>()

    // Phase A: Fetch core candidate manifests, routers, server, and socket context
    const coreCandidates = [
      'package.json',
      'Backend/package.json',
      'src/App.jsx',
      'src/App.tsx',
      'src/App.js',
      'src/main.jsx',
      'src/main.tsx',
      'Backend/Server.js',
      'Backend/server.js',
      'server.js',
      'src/context/SocketContext.jsx',
      'src/context/SocketContext.js',
    ]

    for (const path of coreCandidates) {
      if (sourceFilesMap.size >= 8) break
      if (treePathSet.size === 0 || treePathSet.has(path)) {
        try {
          const fileRes = await getRepositoryFileContent(existingInstallation.id, owner, repo, path)
          if (fileRes.success && fileRes.data && fileRes.data.content) {
            if (fileRes.data.content.length <= 500000) {
              sourceFilesMap.set(path, fileRes.data.content)
            }
          }
        } catch {
          // Ignore missing files
        }
      }
    }

    // Phase B: Dependency discovery from fetched routing files (e.g. src/App.jsx)
    const routerContent =
      sourceFilesMap.get('src/App.jsx') ||
      sourceFilesMap.get('src/App.tsx') ||
      sourceFilesMap.get('src/App.js') ||
      sourceFilesMap.get('App.jsx') ||
      sourceFilesMap.get('App.tsx')

    if (routerContent) {
      const referencedComponentNames = new Set<string>()

      // Match <Route ... element={<ComponentName />} />
      const elementRegex = /<Route\s+[^>]*?\belement\s*=\s*{\s*<\s*([A-Z][a-zA-Z0-9_]*)/g
      let match: RegExpExecArray | null
      while ((match = elementRegex.exec(routerContent)) !== null) {
        if (match[1]) referencedComponentNames.add(match[1])
      }

      // Match import ComponentName from './pages/ComponentName'
      const importRegex = /import\s+(?:([A-Z][a-zA-Z0-9_]*)|{\s*([^}]+)\s*})\s+from\s+["']([^"']+)["']/g
      while ((match = importRegex.exec(routerContent)) !== null) {
        const defaultImport = match[1]
        const namedImports = match[2]
        if (defaultImport) referencedComponentNames.add(defaultImport)
        if (namedImports) {
          namedImports.split(',').forEach((n) => {
            const cleaned = n.trim().split(/\s+as\s+/)[0].trim()
            if (/^[A-Z]/.test(cleaned)) referencedComponentNames.add(cleaned)
          })
        }
      }

      // Map component names to Git tree paths and fetch bounded files
      for (const compName of referencedComponentNames) {
        if (sourceFilesMap.size >= 8) break
        const candidatePaths = [
          `src/pages/${compName}.jsx`,
          `src/pages/${compName}.tsx`,
          `src/pages/${compName}.js`,
          `src/components/${compName}.jsx`,
          `src/components/${compName}.tsx`,
          `src/components/${compName}.js`,
          `src/${compName}.jsx`,
          `src/${compName}.tsx`,
          `pages/${compName}.jsx`,
          `pages/${compName}.tsx`,
        ]

        for (const candPath of candidatePaths) {
          if (sourceFilesMap.size >= 8) break
          if (treePathSet.has(candPath) && !sourceFilesMap.has(candPath)) {
            try {
              const fileRes = await getRepositoryFileContent(existingInstallation.id, owner, repo, candPath)
              if (fileRes.success && fileRes.data && fileRes.data.content) {
                if (fileRes.data.content.length <= 500000) {
                  sourceFilesMap.set(candPath, fileRes.data.content)
                }
              }
            } catch {
              // Ignore missing files
            }
          }
        }
      }
    }

    // 7. Generate grounded TestPlan using AI provider & Zod validation
    const generationResult = await generateTestPlan({
      repositoryFullName: fullName,
      analysis,
      sourceFilesMap,
    })

    // 8. Persist TestPlan into repository_analysis tech_stack JSONB without overwriting existing analysis fields
    const savedRecord = await saveTestPlanToRepositoryAnalysis(
      user.id,
      fullName,
      generationResult.testPlan,
      generationResult.meta
    )

    return NextResponse.json(
      {
        success: true,
        repositoryId: savedRecord?.repositoryId || latestAnalysisRecord.repositoryId,
        analysisId: savedRecord?.analysisId || latestAnalysisRecord.id,
        testPlan: generationResult.testPlan,
        meta: generationResult.meta,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    console.error('[API Route /api/github/repositories/[owner]/[repo]/ai/test-plan] Error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return NextResponse.json(
      { error: 'test_plan_generation_failed', message: error?.message || 'Failed to generate test plan.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
