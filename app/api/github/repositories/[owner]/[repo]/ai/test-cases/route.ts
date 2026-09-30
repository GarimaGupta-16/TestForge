import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  extractGitHubIdentityId,
  findInstallationForAccount,
  getRepositoryTree,
  getRepositoryFileContent,
} from '@/lib/github/client'
import { getLatestAnalysisForRepo } from '@/lib/db/repositories'
import { saveTestCasesBatch } from '@/lib/db/test-cases'
import { generateTestCases } from '@/lib/ai/generator'

interface RouteParams {
  params: Promise<{
    owner: string
    repo: string
  }>
}

/**
 * POST /api/github/repositories/[owner]/[repo]/ai/test-cases
 *
 * Generates grounded, concrete executable TestCase objects based on persisted TestPlan scenarios.
 * Sets Cache-Control: no-store.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
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

    // 2. Extract GitHub account provider ID
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
        { error: 'analysis_required', message: 'Repository must be analyzed before generating test cases.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const analysis = latestAnalysisRecord.analysis
    const testPlan = analysis.testPlan

    if (!testPlan || !testPlan.scenarios || testPlan.scenarios.length === 0) {
      return NextResponse.json(
        { error: 'test_plan_required', message: 'Repository must have a generated TestPlan before generating test cases.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 6. Bounded dependency-aware context selection
    const treeResult = await getRepositoryTree(existingInstallation.id, owner, repo)
    const treePathSet = new Set<string>()
    if (treeResult.success && treeResult.data) {
      treeResult.data.tree.forEach((e) => treePathSet.add(e.path))
    }

    const sourceFilesMap = new Map<string, string>()

    const coreCandidates = [
      'package.json',
      'Backend/package.json',
      'src/App.jsx',
      'src/App.tsx',
      'src/App.js',
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

    // Target view component resolution
    const routerContent =
      sourceFilesMap.get('src/App.jsx') ||
      sourceFilesMap.get('src/App.tsx') ||
      sourceFilesMap.get('src/App.js')

    if (routerContent) {
      const referencedComponentNames = new Set<string>()
      const elementRegex = /<Route\s+[^>]*?\belement\s*=\s*{\s*<\s*([A-Z][a-zA-Z0-9_]*)/g
      let match: RegExpExecArray | null
      while ((match = elementRegex.exec(routerContent)) !== null) {
        if (match[1]) referencedComponentNames.add(match[1])
      }

      for (const compName of referencedComponentNames) {
        if (sourceFilesMap.size >= 8) break
        const candidatePaths = [
          `src/pages/${compName}.jsx`,
          `src/pages/${compName}.tsx`,
          `src/components/${compName}.jsx`,
          `src/components/${compName}.tsx`,
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

    // 7. Generate grounded test cases
    const generationResult = await generateTestCases({
      repositoryFullName: fullName,
      analysis,
      testPlan,
      sourceFilesMap,
    })

    // 8. Persist idempotently into public.test_cases database table
    const savedTestCases = await saveTestCasesBatch(
      user.id,
      fullName,
      generationResult.suite.testCases
    )

    return NextResponse.json(
      {
        success: true,
        repositoryId: latestAnalysisRecord.repositoryId,
        count: savedTestCases.length,
        testCases: savedTestCases,
        meta: generationResult.meta,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    console.error('[API Route /api/github/repositories/[owner]/[repo]/ai/test-cases] Error', {
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return NextResponse.json(
      { error: 'test_case_generation_failed', message: error?.message || 'Failed to generate test cases.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
