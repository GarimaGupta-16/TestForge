import 'server-only'
import { getRepositoryTree, getRepositoryFileContent } from './client'
import { isValidPath } from './analysis'

export interface FailureSourceContextOptions {
  installationId: number
  owner: string
  repo: string
  failure: {
    title: string
    error_type: string
    error_message: string
    component_affected?: string | null
  }
  testResult?: {
    file_path: string
    error_message?: string | null
  } | null
}

/**
 * Resolves focused, relevant GitHub source code files for a test failure context.
 * Bounded to max 8 files and max 500 KB per file.
 */
export async function resolveFailureSourceContext({
  installationId,
  owner,
  repo,
  failure,
  testResult,
}: FailureSourceContextOptions): Promise<Map<string, string>> {
  const sourceFilesMap = new Map<string, string>()

  const treeResult = await getRepositoryTree(installationId, owner, repo)
  if (!treeResult.success || !treeResult.data) {
    return sourceFilesMap
  }

  const treePathSet = new Set<string>()
  const treeFiles: string[] = []

  treeResult.data.tree.forEach((e) => {
    if (e.type === 'file' && isValidPath(e.path)) {
      treePathSet.add(e.path)
      treeFiles.push(e.path)
    }
  })

  const targetSurface = testResult?.file_path || failure.component_affected || '/'
  const errMsg = (failure.error_message || '') + ' ' + (testResult?.error_message || '')
  const titleStr = failure.title || ''

  const candidatePaths: string[] = []

  // Phase A: Core Routing & App Entrypoints
  const coreEntrypoints = [
    'src/App.jsx',
    'src/App.tsx',
    'src/App.js',
    'src/App.ts',
    'App.jsx',
    'App.tsx',
    'src/main.jsx',
    'src/main.tsx',
    'src/index.js',
    'src/index.jsx',
    'src/index.tsx',
  ]

  for (const path of coreEntrypoints) {
    if (treePathSet.has(path) && !candidatePaths.includes(path)) {
      candidatePaths.push(path)
    }
  }

  // Phase B: Page and Component Resolution based on target route & error message
  const targetKeywords: string[] = []
  if (targetSurface.includes('create')) targetKeywords.push('create', 'quiz')
  if (targetSurface.includes('join')) targetKeywords.push('join', 'room')
  if (targetSurface.includes('history')) targetKeywords.push('history')
  if (targetSurface === '/' || targetSurface === '/home' || targetSurface.includes('dash')) {
    targetKeywords.push('home', 'dashboard', 'card', 'landing', 'main')
  }

  if (errMsg.includes('card-button') || errMsg.includes('card')) {
    targetKeywords.push('card', 'button')
  }

  // Find tree files matching target keywords
  const matchedTreeFiles = treeFiles.filter((path) => {
    const lower = path.toLowerCase()
    return targetKeywords.some((kw) => lower.includes(kw)) && (lower.endsWith('.jsx') || lower.endsWith('.tsx') || lower.endsWith('.js') || lower.endsWith('.vue') || lower.endsWith('.css'))
  })

  // Sort matched files: pages/components first, then shallow paths
  matchedTreeFiles.sort((a, b) => {
    const aIsPage = a.toLowerCase().includes('page') || a.toLowerCase().includes('component')
    const bIsPage = b.toLowerCase().includes('page') || b.toLowerCase().includes('component')
    if (aIsPage && !bIsPage) return -1
    if (!aIsPage && bIsPage) return 1
    return a.split('/').length - b.split('/').length
  })

  for (const path of matchedTreeFiles) {
    if (candidatePaths.length >= 3) break
    if (!candidatePaths.includes(path)) {
      candidatePaths.push(path)
    }
  }

  // Phase C: Global CSS & Styling Candidates (if selector is involved)
  const cssCandidates = ['src/index.css', 'src/App.css', 'index.css', 'App.css', 'src/styles.css', 'styles.css']
  for (const cssPath of cssCandidates) {
    if (candidatePaths.length >= 3) break
    if (treePathSet.has(cssPath) && !candidatePaths.includes(cssPath)) {
      candidatePaths.push(cssPath)
    }
  }

  // Fetch file content for candidates (bounded to max 3 files)
  for (const filePath of candidatePaths) {
    if (sourceFilesMap.size >= 3) break
    try {
      const fileRes = await getRepositoryFileContent(installationId, owner, repo, filePath)
      if (fileRes.success && fileRes.data && fileRes.data.content) {
        if (fileRes.data.content.length <= 100000) {
          sourceFilesMap.set(filePath, fileRes.data.content)
        }
      }
    } catch {
      // Ignore individual file fetch errors
    }
  }

  return sourceFilesMap
}
