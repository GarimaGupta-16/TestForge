import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  extractGitHubIdentityId,
  findInstallationForAccount,
  getRepositoryTree,
  getRepositoryFileContent,
} from '@/lib/github/client'
import { analyzeRepositoryStructure, isValidPath } from '@/lib/github/analysis'
import { saveRepositoryAnalysisResult } from '@/lib/db/repositories'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
  }>
}

/**
 * POST /api/github/repositories/[owner]/[repo]/analyze
 *
 * Runs deterministic repository structure analysis on an owner/repo
 * accessible to the authenticated user's active GitHub App installation,
 * and persists the result in Supabase.
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

    // 5. Fetch Git tree
    const treeResult = await getRepositoryTree(existingInstallation.id, owner, repo)
    if (!treeResult.success || !treeResult.data) {
      return NextResponse.json(
        { error: 'tree_fetch_failed', message: treeResult.message || 'Failed to fetch repository tree.' },
        { status: treeResult.status || 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const { defaultBranch, tree, isPrivate, description } = treeResult.data
    const treePathSet = new Set(tree.map((e) => e.path))

    // 6. Selectively fetch bounded configuration & source files
    // A. Package Manifests (max 5)
    const packageManifestPaths: string[] = []
    if (treePathSet.has('package.json')) {
      packageManifestPaths.push('package.json')
    }

    const nestedManifestCandidates = tree
      .map((e) => e.path)
      .filter((p) => p.endsWith('package.json') && p !== 'package.json' && isValidPath(p))

    const priorityDirs = ['backend/', 'server/', 'frontend/', 'client/', 'services/', 'api/', 'web/', 'app/']
    nestedManifestCandidates.sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const aPriority = priorityDirs.some((d) => aLower.startsWith(d)) ? 0 : 1
      const bPriority = priorityDirs.some((d) => bLower.startsWith(d)) ? 0 : 1
      if (aPriority !== bPriority) return aPriority - bPriority
      return a.split('/').length - b.split('/').length
    })

    for (const p of nestedManifestCandidates) {
      if (packageManifestPaths.length < 5) {
        packageManifestPaths.push(p)
      }
    }

    // B. Other Candidate Config Files (max 5)
    const candidateConfigFiles = [
      'tsconfig.json',
      'jsconfig.json',
      'next.config.mjs',
      'next.config.js',
      'next.config.ts',
      'vite.config.ts',
      'vite.config.js',
      'vitest.config.ts',
      'vitest.config.js',
      'jest.config.js',
      'jest.config.ts',
      'playwright.config.ts',
      'playwright.config.js',
      'README.md',
    ]

    const configFilesToFetch: string[] = []
    for (const f of candidateConfigFiles) {
      if (treePathSet.has(f) && configFilesToFetch.length < 5) {
        configFilesToFetch.push(f)
      }
    }

    // C. Routing / Key Source Files for Router & Server Inspection (max 8)
    const routingCandidates = [
      'Backend/Server.js', 'Backend/server.js', 'Backend/index.js', 'Backend/index.ts',
      'server.js', 'server.ts', 'src/server.js', 'src/server.ts',
      'api/server.js', 'api/server.ts', 'server/index.js', 'server/index.ts',
      'src/App.jsx', 'src/App.tsx', 'src/App.js', 'src/App.ts',
      'App.jsx', 'App.tsx', 'App.js', 'App.ts',
      'src/main.jsx', 'src/main.tsx', 'main.jsx', 'main.tsx',
      'src/routes.jsx', 'src/routes.tsx', 'routes.jsx', 'routes.tsx',
      'src/router.jsx', 'src/router.tsx', 'router.jsx', 'router.tsx',
    ]

    const routingFilesToFetch: string[] = []
    for (const f of routingCandidates) {
      if (treePathSet.has(f) && routingFilesToFetch.length < 8) {
        routingFilesToFetch.push(f)
      }
    }

    // Combine all unique target files to fetch
    const filesToFetch = Array.from(new Set([
      ...packageManifestPaths,
      ...configFilesToFetch,
      ...routingFilesToFetch,
    ]))

    const configFilesMap = new Map<string, string>()
    for (const path of filesToFetch) {
      const contentRes = await getRepositoryFileContent(existingInstallation.id, owner, repo, path)
      if (contentRes.success && contentRes.data && contentRes.data.content) {
        configFilesMap.set(path, contentRes.data.content)
      }
    }

    // 7. Run deterministic analysis engine
    const analysisResult = analyzeRepositoryStructure(tree, configFilesMap)

    // 8. Persist repository & analysis in database
    const fullName = `${owner}/${repo}`
    const savedRecords = await saveRepositoryAnalysisResult(
      user.id,
      {
        name: repo,
        fullName,
        defaultBranch,
        description: description ?? null,
        isPrivate: isPrivate ?? false,
      },
      analysisResult
    )

    return NextResponse.json(
      {
        success: true,
        repositoryId: savedRecords?.repositoryId || null,
        analysisId: savedRecords?.analysisId || null,
        analysis: analysisResult,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    console.error('[API Route /api/github/repositories/[owner]/[repo]/analyze] Error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return NextResponse.json(
      { error: 'analysis_failed', message: 'An unexpected error occurred during repository analysis.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
