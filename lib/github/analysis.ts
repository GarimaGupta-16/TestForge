import type { GitHubTreeEntry } from './types'

export interface AnalysisStack {
  frontend: string
  backend: string
  database: string
  buildTool: string
  testFramework: string
}

export interface AnalysisFeatures {
  hasAuthentication: boolean
  hasDatabase: boolean
  hasApiClient: boolean
  hasWebSockets: boolean
  hasExistingTests: boolean
}

export interface AnalysisStructure {
  sourceDirs: string[]
  staticDirs: string[]
  testDirs: string[]
}

export interface AnalysisRoute {
  path: string
  type: 'page' | 'api'
  framework?: string
  file?: string
}

export interface AnalysisMetrics {
  componentsAnalyzed: number
  reusableComponents?: number
  pageComponents?: number
  contextComponents?: number
  apiRoutesFound: number
  pageRoutesFound: number
  existingTestsFound: number
}

export interface ManifestEvidence {
  path: string
  packageManager?: string
  dependenciesCount: number
}

export interface AnalysisEvidence {
  manifests: ManifestEvidence[]
  frameworks: string[]
  backend: string[]
  websockets: string[]
  database: string[]
  routing: string[]
  inspectedFiles: string[]
}

export interface RepositoryAnalysisResult {
  analysisVersion: string
  summary: string
  primaryLanguage: string
  packageManager: string
  stack: AnalysisStack
  techStack: string[]
  detectedFeatures: AnalysisFeatures
  structure: AnalysisStructure
  routes: AnalysisRoute[]
  metrics: AnalysisMetrics
  evidence?: AnalysisEvidence
}

const IGNORED_PATHS = [
  'node_modules/',
  '.git/',
  '.next/',
  'dist/',
  'build/',
  'out/',
  'coverage/',
  '.turbo/',
  'vendor/',
]

/**
 * Filter out ignored paths like node_modules, .git, .next, etc.
 */
export function isValidPath(path: string): boolean {
  return !IGNORED_PATHS.some((ignored) => path.startsWith(ignored) || path.includes(`/${ignored}`))
}

/**
 * Detect package manager based on package.json or lockfile in Git tree.
 */
export function detectPackageManager(
  packageJsonObj: any | null,
  tree: GitHubTreeEntry[]
): string {
  if (packageJsonObj?.packageManager && typeof packageJsonObj.packageManager === 'string') {
    const pm = packageJsonObj.packageManager.split('@')[0].trim().toLowerCase()
    if (['pnpm', 'npm', 'yarn', 'bun'].includes(pm)) {
      return pm
    }
  }

  const paths = new Set(tree.map((e) => e.path))

  if (paths.has('pnpm-lock.yaml')) return 'pnpm'
  if (paths.has('package-lock.json')) return 'npm'
  if (paths.has('yarn.lock')) return 'yarn'
  if (paths.has('bun.lockb') || paths.has('bun.lock')) return 'bun'

  return 'unknown'
}

/**
 * Normalizes Next.js App Router dynamic route segments
 * e.g. "app/users/[id]/page.tsx" -> "/users/[id]"
 * e.g. "app/api/quiz/[...slug]/route.ts" -> "/api/quiz/[...slug]"
 */
export function normalizeAppRoutePath(filePath: string, isApi: boolean): string {
  let route = filePath.replace(/^app\//, '').replace(/^src\/app\//, '')

  if (isApi) {
    route = route.replace(/\/route\.(ts|js|tsx|jsx)$/, '')
    if (route === 'route.ts' || route === 'route.js') route = ''
    return route.startsWith('/') ? route : `/${route}`
  } else {
    route = route.replace(/\/page\.(ts|js|tsx|jsx)$/, '')
    if (route === 'page.ts' || route === 'page.js' || route === 'page.tsx' || route === 'page.jsx') route = ''
    // Handle route groups like (auth), (dashboard)
    const segments = route.split('/').filter((s) => !/^\(.*\)$/.test(s))
    const cleanRoute = segments.join('/')
    return cleanRoute === '' ? '/' : cleanRoute.startsWith('/') ? cleanRoute : `/${cleanRoute}`
  }
}

/**
 * Normalizes Next.js Pages Router route segments
 * e.g. "pages/api/quiz.ts" -> "/api/quiz"
 * e.g. "pages/dashboard/index.tsx" -> "/dashboard"
 */
export function normalizePagesRoutePath(filePath: string): string {
  let route = filePath.replace(/^pages\//, '').replace(/^src\/pages\//, '')
  route = route.replace(/\.(ts|js|tsx|jsx)$/, '')
  route = route.replace(/\/index$/, '')
  if (route === 'index') route = ''
  return route === '' ? '/' : route.startsWith('/') ? route : `/${route}`
}

/**
 * Helper to extract React Router routes from JSX/TSX or JS/TS file contents.
 */
export function extractReactRouterRoutes(content: string, filePath: string): AnalysisRoute[] {
  const routes: AnalysisRoute[] = []
  const routeSet = new Set<string>()

  // 1. Match JSX <Route path="..." /> or <Route path={"..."}>
  const jsxRouteRegex = /<Route\s+[^>]*?\bpath\s*=\s*(?:{\s*["']([^"']+)["']\s*}|["']([^"']+)["'])/g
  let match: RegExpExecArray | null
  while ((match = jsxRouteRegex.exec(content)) !== null) {
    const rawPath = match[1] || match[2]
    if (rawPath) {
      let normalized = rawPath.trim()
      if (!normalized.startsWith('/')) normalized = `/${normalized}`
      if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1)

      if (!routeSet.has(normalized)) {
        routeSet.add(normalized)
        routes.push({
          path: normalized,
          type: 'page',
          framework: 'React Router',
          file: filePath,
        })
      }
    }
  }

  // 2. Match object routes path: '...'
  const objRouteRegex = /\bpath\s*:\s*["']([^"']+)["']/g
  while ((match = objRouteRegex.exec(content)) !== null) {
    const rawPath = match[1]
    if (rawPath) {
      let normalized = rawPath.trim()
      if (!normalized.startsWith('/')) normalized = `/${normalized}`
      if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1)

      if (!routeSet.has(normalized)) {
        routeSet.add(normalized)
        routes.push({
          path: normalized,
          type: 'page',
          framework: 'React Router',
          file: filePath,
        })
      }
    }
  }

  return routes
}

/**
 * Helper to extract Express / Node.js backend API routes from JS/TS source files.
 */
export function extractExpressRoutes(content: string, filePath: string): AnalysisRoute[] {
  const routes: AnalysisRoute[] = []
  const routeSet = new Set<string>()

  // 1. Discover router prefixes: app.use('/prefix', router)
  const prefixMap = new Map<string, string>()
  const usePrefixRegex = /(?:app|router)\.use\s*\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_$]+)/gi
  let useMatch: RegExpExecArray | null
  while ((useMatch = usePrefixRegex.exec(content)) !== null) {
    const prefix = useMatch[1].trim()
    const routerVar = useMatch[2].trim()
    if (prefix && routerVar && prefix.startsWith('/')) {
      prefixMap.set(routerVar, prefix)
    }
  }

  // 2. Discover HTTP endpoints: (app|router).(get|post|put|patch|delete)('/path', ...)
  const routeMethodRegex = /(?:app|([a-zA-Z0-9_$]+))\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  while ((match = routeMethodRegex.exec(content)) !== null) {
    const targetVar = match[1] // undefined if 'app'
    const rawPath = match[3].trim()

    if (rawPath) {
      let fullPath = rawPath
      if (targetVar && prefixMap.has(targetVar)) {
        const prefix = prefixMap.get(targetVar)!
        fullPath = `${prefix.replace(/\/$/, '')}/${rawPath.replace(/^\//, '')}`
      }
      if (!fullPath.startsWith('/')) fullPath = `/${fullPath}`
      if (fullPath.length > 1 && fullPath.endsWith('/')) fullPath = fullPath.slice(0, -1)

      if (!routeSet.has(fullPath)) {
        routeSet.add(fullPath)
        routes.push({
          path: fullPath,
          type: 'api',
          framework: 'Express',
          file: filePath,
        })
      }
    }
  }

  return routes
}


/**
 * Deterministic Repository Analysis Engine.
 * Parses repository tree and config file contents to construct a rich, safe analysis profile.
 */
export function analyzeRepositoryStructure(
  tree: GitHubTreeEntry[],
  configFiles: Map<string, string>
): RepositoryAnalysisResult {
  const validTree = tree.filter((entry) => isValidPath(entry.path))
  const treePaths = validTree.map((e) => e.path)
  const treePathsSet = new Set(treePaths)

  // 1. Discover and parse all package.json manifests present in configFiles
  const manifestEntries: Array<{
    path: string
    packageJson: any
    deps: Record<string, string>
  }> = []

  const mergedDeps: Record<string, string> = {}
  const manifestEvidenceList: ManifestEvidence[] = []

  for (const [path, content] of configFiles.entries()) {
    if (path.endsWith('package.json') && isValidPath(path)) {
      try {
        const parsed = JSON.parse(content)
        const combinedDeps = {
          ...parsed?.dependencies,
          ...parsed?.devDependencies,
        }
        manifestEntries.push({
          path,
          packageJson: parsed,
          deps: combinedDeps,
        })
        Object.assign(mergedDeps, combinedDeps)

        manifestEvidenceList.push({
          path,
          packageManager: parsed?.packageManager,
          dependenciesCount: Object.keys(combinedDeps).length,
        })
      } catch {
        // Ignore invalid JSON
      }
    }
  }

  const rootManifest = manifestEntries.find((m) => m.path === 'package.json')

  // 2. Primary Language Detection
  let primaryLanguage = 'JavaScript'
  const tsFiles = treePaths.filter((p) => /\.(ts|tsx)$/.test(p))
  const jsFiles = treePaths.filter((p) => /\.(js|jsx|mjs|cjs)$/.test(p))

  if (tsFiles.length > 0 || configFiles.has('tsconfig.json')) {
    primaryLanguage = 'TypeScript'
  } else if (jsFiles.length > 0) {
    primaryLanguage = 'JavaScript'
  }

  // 3. Package Manager Detection with Evidence
  let packageManager = 'unknown'
  const packageManagerEvidence: string[] = []

  if (rootManifest?.packageJson?.packageManager) {
    const pm = String(rootManifest.packageJson.packageManager).split('@')[0].trim().toLowerCase()
    if (['pnpm', 'npm', 'yarn', 'bun'].includes(pm)) {
      packageManager = pm
      packageManagerEvidence.push(`package.json "packageManager": "${rootManifest.packageJson.packageManager}"`)
    }
  }

  if (packageManager === 'unknown') {
    if (treePathsSet.has('pnpm-lock.yaml')) {
      packageManager = 'pnpm'
      packageManagerEvidence.push('pnpm-lock.yaml present in tree root')
    } else if (treePathsSet.has('package-lock.json')) {
      packageManager = 'npm'
      packageManagerEvidence.push('package-lock.json present in tree root')
    } else if (treePathsSet.has('yarn.lock')) {
      packageManager = 'yarn'
      packageManagerEvidence.push('yarn.lock present in tree root')
    } else if (treePathsSet.has('bun.lockb') || treePathsSet.has('bun.lock')) {
      packageManager = 'bun'
      packageManagerEvidence.push('bun lockfile present in tree root')
    }
  }

  if (packageManager === 'unknown') {
    for (const m of manifestEntries) {
      if (m.packageJson?.packageManager) {
        const pm = String(m.packageJson.packageManager).split('@')[0].trim().toLowerCase()
        if (['pnpm', 'npm', 'yarn', 'bun'].includes(pm)) {
          packageManager = pm
          packageManagerEvidence.push(`${m.path} "packageManager": "${m.packageJson.packageManager}"`)
          break
        }
      }
    }
  }

  if (packageManager === 'unknown') {
    if (treePaths.some((p) => p.endsWith('package-lock.json'))) {
      packageManager = 'npm'
      packageManagerEvidence.push('package-lock.json present in nested directory')
    } else if (treePaths.some((p) => p.endsWith('pnpm-lock.yaml'))) {
      packageManager = 'pnpm'
      packageManagerEvidence.push('pnpm-lock.yaml present in nested directory')
    } else if (treePaths.some((p) => p.endsWith('yarn.lock'))) {
      packageManager = 'yarn'
      packageManagerEvidence.push('yarn.lock present in nested directory')
    }
  }

  // 4. Framework & Library Detection from Merged Dependencies
  let frontendFramework = 'None'
  if ('next' in mergedDeps) frontendFramework = 'Next.js'
  else if ('@remix-run/react' in mergedDeps) frontendFramework = 'Remix'
  else if ('astro' in mergedDeps) frontendFramework = 'Astro'
  else if ('vue' in mergedDeps || 'nuxt' in mergedDeps) frontendFramework = 'Vue.js'
  else if ('@angular/core' in mergedDeps) frontendFramework = 'Angular'
  else if ('svelte' in mergedDeps || '@sveltejs/kit' in mergedDeps) frontendFramework = 'Svelte'
  else if ('react' in mergedDeps) frontendFramework = 'React'

  let backendFramework = 'None'
  const backendEvidence: string[] = []

  if ('next' in mergedDeps) {
    backendFramework = 'Next.js Route Handlers'
    backendEvidence.push('next dependency present')
  } else if ('express' in mergedDeps) {
    backendFramework = 'Express'
    const manifestsWithExpress = manifestEntries
      .filter((m) => 'express' in m.deps)
      .map((m) => `${m.path} (express)`)
    backendEvidence.push(...manifestsWithExpress)
    if (treePathsSet.has('Backend/Server.js')) backendEvidence.push('Backend/Server.js present in tree')
    else if (treePathsSet.has('server.js')) backendEvidence.push('server.js present in tree')
  } else if ('@nestjs/core' in mergedDeps) {
    backendFramework = 'NestJS'
    backendEvidence.push('@nestjs/core dependency present')
  } else if ('fastify' in mergedDeps) {
    backendFramework = 'Fastify'
    backendEvidence.push('fastify dependency present')
  } else if ('koa' in mergedDeps) {
    backendFramework = 'Koa'
    backendEvidence.push('koa dependency present')
  }

  let databaseLib = 'None'
  const databaseEvidence: string[] = []

  if ('mongoose' in mergedDeps || 'mongodb' in mergedDeps) {
    databaseLib = 'MongoDB'
    databaseEvidence.push('mongoose/mongodb dependency present')
  } else if ('@prisma/client' in mergedDeps || 'prisma' in mergedDeps) {
    databaseLib = 'Prisma'
    databaseEvidence.push('prisma dependency present')
  } else if ('@supabase/supabase-js' in mergedDeps || '@supabase/ssr' in mergedDeps) {
    databaseLib = 'Supabase'
    databaseEvidence.push('@supabase dependency present')
  } else if ('pg' in mergedDeps || 'postgres' in mergedDeps) {
    databaseLib = 'PostgreSQL'
    databaseEvidence.push('pg/postgres dependency present')
  } else if ('drizzle-orm' in mergedDeps) {
    databaseLib = 'Drizzle'
    databaseEvidence.push('drizzle-orm dependency present')
  } else if ('firebase' in mergedDeps || 'firebase-admin' in mergedDeps) {
    databaseLib = 'Firebase'
    databaseEvidence.push('firebase dependency present')
  }

  let buildTool = 'None'
  if ('next' in mergedDeps) buildTool = 'Next.js / SWC'
  else if ('vite' in mergedDeps || treePathsSet.has('vite.config.ts') || treePathsSet.has('vite.config.js')) buildTool = 'Vite'
  else if ('webpack' in mergedDeps) buildTool = 'Webpack'
  else if ('turbopack' in mergedDeps) buildTool = 'Turbopack'
  else if ('esbuild' in mergedDeps) buildTool = 'esbuild'

  let testFramework = 'None'
  if ('@playwright/test' in mergedDeps) testFramework = 'Playwright'
  else if ('cypress' in mergedDeps) testFramework = 'Cypress'
  else if ('vitest' in mergedDeps) testFramework = 'Vitest'
  else if ('jest' in mergedDeps) testFramework = 'Jest'

  // Feature Flags with Evidence
  const hasAuthentication = Boolean(
    '@supabase/supabase-js' in mergedDeps ||
      '@supabase/ssr' in mergedDeps ||
      'next-auth' in mergedDeps ||
      '@auth/core' in mergedDeps ||
      '@clerk/nextjs' in mergedDeps ||
      'lucia' in mergedDeps ||
      'firebase' in mergedDeps ||
      treePaths.some((p) => p.includes('auth') || p.includes('login'))
  )

  const hasDatabase = databaseLib !== 'None'
  const hasApiClient = Boolean('axios' in mergedDeps || '@tanstack/react-query' in mergedDeps || 'swr' in mergedDeps || '@trpc/client' in mergedDeps)

  const websocketEvidence: string[] = []
  const hasWebSockets = Boolean(
    'socket.io' in mergedDeps ||
      'socket.io-client' in mergedDeps ||
      'ws' in mergedDeps
  )

  if (hasWebSockets) {
    const wsManifests = manifestEntries
      .filter((m) => 'socket.io' in m.deps || 'socket.io-client' in m.deps || 'ws' in m.deps)
      .map((m) => `${m.path} (${Object.keys(m.deps).filter((d) => ['socket.io', 'socket.io-client', 'ws'].includes(d)).join(', ')})`)
    websocketEvidence.push(...wsManifests)

    const socketCtxFile = treePaths.find((p) => p.includes('SocketContext') || p.includes('socket'))
    if (socketCtxFile) {
      websocketEvidence.push(`${socketCtxFile} present in tree`)
    }
  }

  // 5. Directory Structure Parsing
  const topDirs = new Set<string>()
  validTree.forEach((e) => {
    const parts = e.path.split('/')
    if (parts.length > 1) {
      topDirs.add(parts[0])
      if (parts[0] === 'src' && parts.length > 2) {
        topDirs.add(`src/${parts[1]}`)
      }
    }
  })

  const sourceDirs = Array.from(topDirs).filter((d) =>
    ['app', 'src', 'components', 'pages', 'lib', 'server', 'utils', 'services', 'hooks', 'src/app', 'src/components', 'src/pages'].includes(d)
  )
  const staticDirs = Array.from(topDirs).filter((d) => ['public', 'static', 'assets'].includes(d))
  const testDirs = Array.from(topDirs).filter((d) => ['tests', '__tests__', 'e2e', 'cypress', 'spec'].includes(d))

  // 6. Component Categorization
  const validComponentFiles = treePaths.filter(
    (p) =>
      /\.(tsx|jsx)$/.test(p) &&
      !p.includes('.test.') &&
      !p.includes('.spec.') &&
      !p.includes('.stories.') &&
      !p.endsWith('.d.ts')
  )

  const reusableComponents: string[] = []
  const pageComponents: string[] = []
  const contextComponents: string[] = []

  validComponentFiles.forEach((p) => {
    if (p.startsWith('pages/') || p.includes('/pages/') || p.startsWith('app/') || p.includes('/app/')) {
      pageComponents.push(p)
    } else if (p.includes('context/') || p.includes('contexts/') || p.includes('provider/') || p.includes('providers/')) {
      contextComponents.push(p)
    } else {
      reusableComponents.push(p)
    }
  })

  const componentsAnalyzedCount = reusableComponents.length + contextComponents.length

  // 7. Route & React Router Detection
  const routes: AnalysisRoute[] = []
  const routeEvidence: string[] = []

  const hasReactRouter = 'react-router-dom' in mergedDeps || 'react-router' in mergedDeps

  if (hasReactRouter) {
    for (const [filePath, content] of configFiles.entries()) {
      if (
        /\.(jsx|tsx|js|ts)$/.test(filePath) &&
        !filePath.endsWith('package.json') &&
        !filePath.endsWith('config.js') &&
        !filePath.endsWith('config.ts')
      ) {
        const extractedRoutes = extractReactRouterRoutes(content, filePath)
        if (extractedRoutes.length > 0) {
          routes.push(...extractedRoutes)
          routeEvidence.push(`${filePath} (${extractedRoutes.length} React Router routes)`)
        }
      }
    }
  }

  // Next.js App Router Routes
  const appPageFiles = treePaths.filter(
    (p) => /^(src\/)?app\/(.*\/)?page\.(tsx|jsx|js|ts)$/.test(p)
  )
  appPageFiles.forEach((p) => {
    routes.push({ path: normalizeAppRoutePath(p, false), type: 'page', framework: 'Next.js App Router', file: p })
  })

  const appRouteFiles = treePaths.filter(
    (p) => /^(src\/)?app\/(.*\/)?route\.(ts|js)$/.test(p)
  )
  appRouteFiles.forEach((p) => {
    routes.push({ path: normalizeAppRoutePath(p, true), type: 'api', framework: 'Next.js App Router', file: p })
  })

  // Next.js Pages Router Routes (only if not already mapped via React Router)
  if (routes.length === 0) {
    const pagesFiles = treePaths.filter(
      (p) =>
        /^(src\/)?pages\/(.*\/)?[^/]+\.(tsx|jsx|js|ts)$/.test(p) &&
        !p.includes('/_app.') &&
        !p.includes('/_document.') &&
        !p.includes('/_error.') &&
        !p.endsWith('pages/_app.tsx') &&
        !p.endsWith('pages/_document.tsx')
    )
    pagesFiles.forEach((p) => {
      const isApi = p.includes('pages/api/') || p.includes('src/pages/api/')
      routes.push({ path: normalizePagesRoutePath(p), type: isApi ? 'api' : 'page', framework: 'Next.js Pages Router', file: p })
    })
  }

  // Express / Node.js Backend API Route Inspection
  for (const [filePath, content] of configFiles.entries()) {
    if (
      /\.(jsx|tsx|js|ts)$/.test(filePath) &&
      !filePath.endsWith('package.json') &&
      !filePath.endsWith('config.js') &&
      !filePath.endsWith('config.ts')
    ) {
      const expressRoutes = extractExpressRoutes(content, filePath)
      if (expressRoutes.length > 0) {
        routes.push(...expressRoutes)
        backendEvidence.push(`${filePath} (${expressRoutes.length} Express API routes)`)
      }
    }
  }

  // Existing test files
  const testFiles = treePaths.filter(
    (p) =>
      /\.(spec|test)\.(ts|js|tsx|jsx)$/.test(p) ||
      p.includes('/__tests__/') ||
      p.includes('/tests/') ||
      p.includes('/e2e/')
  )

  const pageRoutesCount = routes.filter((r) => r.type === 'page').length
  const apiRoutesCount = routes.filter((r) => r.type === 'api').length
  const hasExistingTests = testFiles.length > 0 || testFramework !== 'None'

  // Build tech stack list
  const techStackSet = new Set<string>()
  if (frontendFramework !== 'None') techStackSet.add(frontendFramework)
  if (primaryLanguage) techStackSet.add(primaryLanguage)
  if ('react' in mergedDeps && frontendFramework !== 'React') techStackSet.add('React')
  if ('tailwindcss' in mergedDeps || treePathsSet.has('tailwind.config.js') || treePathsSet.has('tailwind.config.ts') || treePathsSet.has('tailwind.config.mjs')) techStackSet.add('Tailwind CSS')
  if ('bootstrap' in mergedDeps) techStackSet.add('Bootstrap')
  if (buildTool === 'Vite' || 'vite' in mergedDeps || treePathsSet.has('vite.config.ts') || treePathsSet.has('vite.config.js')) techStackSet.add('Vite')
  if (backendFramework !== 'None' && backendFramework !== 'Next.js Route Handlers') techStackSet.add(backendFramework)
  if (databaseLib !== 'None') techStackSet.add(databaseLib)
  if (testFramework !== 'None') techStackSet.add(testFramework)
  if (hasWebSockets) techStackSet.add('WebSocket')
  if (hasReactRouter) techStackSet.add('React Router')

  const techStackList = Array.from(techStackSet)

  // Construct summary string
  let summary = `${frontendFramework !== 'None' ? frontendFramework : 'Web'} ${primaryLanguage} application`
  if (techStackList.length > 2) {
    summary += ` using ${techStackList.slice(2).join(', ')}.`
  } else {
    summary += '.'
  }

  const inspectedFiles = Array.from(configFiles.keys())

  const evidence: AnalysisEvidence = {
    manifests: manifestEvidenceList,
    frameworks: [
      ...(frontendFramework !== 'None' ? [`Frontend: ${frontendFramework}`] : []),
      ...(buildTool !== 'None' ? [`Build Tool: ${buildTool}`] : []),
      ...(hasReactRouter ? ['Routing: React Router'] : []),
    ],
    backend: backendEvidence,
    websockets: websocketEvidence,
    database: databaseEvidence,
    routing: routeEvidence,
    inspectedFiles,
  }

  return {
    analysisVersion: '1.0',
    summary,
    primaryLanguage,
    packageManager,
    stack: {
      frontend: frontendFramework,
      backend: backendFramework,
      database: databaseLib,
      buildTool,
      testFramework,
    },
    techStack: techStackList,
    detectedFeatures: {
      hasAuthentication,
      hasDatabase,
      hasApiClient,
      hasWebSockets,
      hasExistingTests,
    },
    structure: {
      sourceDirs,
      staticDirs,
      testDirs,
    },
    routes,
    metrics: {
      componentsAnalyzed: componentsAnalyzedCount,
      reusableComponents: reusableComponents.length,
      pageComponents: pageComponents.length,
      contextComponents: contextComponents.length,
      apiRoutesFound: apiRoutesCount,
      pageRoutesFound: pageRoutesCount,
      existingTestsFound: testFiles.length,
    },
    evidence,
  }
}

