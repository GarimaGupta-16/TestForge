'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Search, Sparkles, RefreshCw, FolderGit2, AlertTriangle, CheckCircle2, Play, FileText } from 'lucide-react'
import { PriorityBadge, StatusBadge, PrimaryButton } from '@/components/primitives'
import { caseFilters, testCases as mockTestCases } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { GitHubRepositoryMetadata } from '@/lib/github/types'

interface FormattedTestCase {
  id: string
  dbId: string
  test: string
  feature: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  type: string
  status: any
  lastRun: string
  sourceEvidence?: string[]
  groundingStatus?: string
}

export function TestCasesTable() {
  const [repositories, setRepositories] = useState<GitHubRepositoryMetadata[]>([])
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [loadingRepos, setLoadingRepos] = useState<boolean>(true)

  const [realTestCases, setRealTestCases] = useState<FormattedTestCase[]>([])
  const [loadingCases, setLoadingCases] = useState<boolean>(false)
  const [hasTestPlan, setHasTestPlan] = useState<boolean | null>(null)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false)
  const [runningRowMap, setRunningRowMap] = useState<Record<string, boolean>>({})
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set())

  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [filter, setFilter] = useState<string>('All')
  const [query, setQuery] = useState('')

  // 1. Fetch connected repositories
  const fetchRepositories = useCallback(async () => {
    setLoadingRepos(true)
    try {
      const res = await fetch('/api/github/repositories', {
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const data = await res.json()
        const repos: GitHubRepositoryMetadata[] = data.repositories || []
        setRepositories(repos)
        if (repos.length > 0 && !selectedRepo) {
          const quizlitRepo = repos.find((r) => r.name.toLowerCase().includes('quizlit'))
          setSelectedRepo(quizlitRepo ? quizlitRepo.fullName : repos[0].fullName)
        }
      }
    } catch {
      // Ignore fetch error
    } finally {
      setLoadingRepos(false)
    }
  }, [selectedRepo])

  useEffect(() => {
    fetchRepositories()
  }, [fetchRepositories])

  // Check if repository has a generated TestPlan
  const checkTestPlanForRepo = useCallback(async (repoFullName: string) => {
    if (!repoFullName) {
      setHasTestPlan(null)
      return
    }
    const [owner, repo] = repoFullName.split('/')
    if (!owner || !repo) return

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/analysis`, {
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (res.ok) {
        const data = await res.json()
        const tp = data?.analysis?.testPlan
        setHasTestPlan(Boolean(tp && tp.scenarios && tp.scenarios.length > 0))
      } else {
        setHasTestPlan(false)
      }
    } catch {
      setHasTestPlan(false)
    }
  }, [])

  // 2. Fetch real test cases when selectedRepo changes
  const fetchTestCasesForRepo = useCallback(async (repoFullName: string) => {
    if (!repoFullName) {
      setRealTestCases([])
      setSelectedCaseIds(new Set())
      return
    }

    const [owner, repo] = repoFullName.split('/')
    if (!owner || !repo) return

    setLoadingCases(true)
    setError(null)
    checkTestPlanForRepo(repoFullName)

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/test-cases`, {
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!res.ok) {
        setRealTestCases([])
        setSelectedCaseIds(new Set())
        return
      }

      const data = await res.json()
      const rawCases = data.testCases || []

      const formatted: FormattedTestCase[] = rawCases.map((c: any) => {
        let meta: any = {}
        if (c.description && c.description.includes('<!-- TESTFORGE_META:')) {
          try {
            const jsonStr = c.description.split('<!-- TESTFORGE_META:')[1].split('-->')[0].trim()
            meta = JSON.parse(jsonStr)
          } catch {
            // Ignore parse error
          }
        }

        const scenarioId = meta.scenarioId || (c.id ? c.id.slice(0, 8) : 'TC-001')
        const priority = meta.priority || 'HIGH'
        const statusLabel =
          c.status === 'pending'
            ? 'Pending'
            : c.status === 'passing'
            ? 'Passed'
            : c.status === 'failing'
            ? 'Failed'
            : 'Pending'

        return {
          id: scenarioId,
          dbId: c.id,
          test: c.title,
          feature: c.file_path || 'Repository Route',
          priority: priority as 'HIGH' | 'MEDIUM' | 'LOW',
          type: (c.category || 'e2e').toUpperCase(),
          status: statusLabel,
          lastRun: c.updated_at ? new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Run',
          sourceEvidence: meta.sourceEvidence || [],
          groundingStatus: meta.groundingStatus || 'verified',
        }
      })

      setRealTestCases(formatted)
      setSelectedCaseIds(new Set())
    } catch {
      setError('Failed to fetch test cases for repository.')
      setRealTestCases([])
      setSelectedCaseIds(new Set())
    } finally {
      setLoadingCases(false)
    }
  }, [checkTestPlanForRepo])

  useEffect(() => {
    if (selectedRepo) {
      fetchTestCasesForRepo(selectedRepo)
    }
  }, [selectedRepo, fetchTestCasesForRepo])

  // Action: Generate Test Plan
  const handleGeneratePlan = async () => {
    if (!selectedRepo || isGeneratingPlan || isGenerating || isRunningTests) return

    const [owner, repo] = selectedRepo.split('/')
    if (!owner || !repo) return

    setIsGeneratingPlan(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/ai/test-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Failed to generate Test Plan. Please ensure repository is analyzed.')
        setHasTestPlan(false)
        return
      }

      const scenarioCount = data.testPlan?.scenarios?.length || 0
      setHasTestPlan(true)
      setSuccessMsg(`Successfully generated Test Plan with ${scenarioCount} grounded scenarios! You can now generate test cases.`)
    } catch {
      setError('Network error while generating AI Test Plan.')
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  // 3. Generate test cases action
  const handleGenerate = async () => {
    if (!selectedRepo || isGenerating || isGeneratingPlan || isRunningTests) return

    const [owner, repo] = selectedRepo.split('/')
    if (!owner || !repo) return

    setIsGenerating(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/ai/test-cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'test_plan_required' || (data.message && data.message.includes('TestPlan'))) {
          setHasTestPlan(false)
        }
        setError(data.message || 'Failed to generate test cases. Please ensure repository is analyzed.')
        return
      }

      setHasTestPlan(true)
      setSuccessMsg(`Successfully generated ${data.count || 0} grounded test cases!`)
      await fetchTestCasesForRepo(selectedRepo)
    } catch {
      setError('Network error while generating AI test cases.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Bounded poll for background test run completion
  const pollTestRunStatus = useCallback(
    async (owner: string, repo: string, runId: string) => {
      const maxAttempts = 30 // Bounded max attempts (45s limit)
      const intervalMs = 1500

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((res) => setTimeout(res, intervalMs))

        try {
          const res = await fetch(`/api/github/repositories/${owner}/${repo}/test-runs/${runId}`, {
            headers: { 'Cache-Control': 'no-cache' },
          })

          if (!res.ok) continue

          const data = await res.json()
          const testRun = data?.testRun
          const results = data?.results || []

          if (testRun && testRun.status !== 'running') {
            const resultsMap = new Map(results.map((r: any) => [r.test_case_id, r]))

            setRealTestCases((prev) =>
              prev.map((item) => {
                const match = resultsMap.get(item.dbId)
                if (match) {
                  const statusLabel =
                    (match as any).status === 'passed' ? 'Passed' : (match as any).status === 'failed' ? 'Failed' : 'Pending'
                  return {
                    ...item,
                    status: statusLabel,
                    lastRun: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  }
                }
                return item
              })
            )

            const passedCount = testRun.passed_tests || 0
            const failedCount = testRun.failed_tests || 0
            const durationSec = testRun.duration_seconds || 0

            setSuccessMsg(
              testRun.status === 'passed'
                ? `Test run completed successfully in ${durationSec}s! ${passedCount} passed, ${failedCount} failed.`
                : `Test run completed with status '${testRun.status}' in ${durationSec}s. ${failedCount} failed.`
            )

            await fetchTestCasesForRepo(`${owner}/${repo}`)
            return testRun
          }
        } catch {
          // Retry on network error up to maxAttempts limit
        }
      }

      await fetchTestCasesForRepo(`${owner}/${repo}`)
      return null
    },
    [fetchTestCasesForRepo]
  )

  // 4. Run test cases action
  const handleRunTests = async (testCaseDbIds?: string[]) => {
    if (!selectedRepo || isRunningTests || isGenerating) return

    const [owner, repo] = selectedRepo.split('/')
    if (!owner || !repo) return

    setIsRunningTests(true)
    setError(null)
    setSuccessMsg(null)

    if (testCaseDbIds && testCaseDbIds.length > 0) {
      setRunningRowMap((prev) => {
        const next = { ...prev }
        testCaseDbIds.forEach((id) => {
          next[id] = true
        })
        return next
      })
    }

    try {
      const payload = testCaseDbIds && testCaseDbIds.length > 0 ? { testCaseIds: testCaseDbIds } : {}
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/test-runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok && res.status !== 202) {
        setError(data.error || 'Failed to execute test suite.')
        return
      }

      const testRun = data.testRun
      if (testRun?.id) {
        setSuccessMsg('Test execution started in background. Running Playwright...')
        await pollTestRunStatus(owner, repo, testRun.id)
      } else {
        await fetchTestCasesForRepo(selectedRepo)
      }
    } catch {
      setError('Network error during test execution.')
    } finally {
      setIsRunningTests(false)
      if (testCaseDbIds && testCaseDbIds.length > 0) {
        setRunningRowMap((prev) => {
          const next = { ...prev }
          testCaseDbIds.forEach((id) => {
            delete next[id]
          })
          return next
        })
      }
    }
  }

  // Single test case execution action
  const handleRunSingleTest = async (dbId: string) => {
    if (!selectedRepo || runningRowMap[dbId] || isGenerating || isGeneratingPlan) return

    const [owner, repo] = selectedRepo.split('/')
    if (!owner || !repo) return

    setRunningRowMap((prev) => ({ ...prev, [dbId]: true }))
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/test-runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ testCaseIds: [dbId] }),
      })

      const data = await res.json()

      if (!res.ok && res.status !== 202) {
        setError(data.error || 'Failed to execute test case.')
        return
      }

      const testRun = data.testRun
      if (testRun?.id) {
        setSuccessMsg('Single test execution started in background. Running Playwright...')
        await pollTestRunStatus(owner, repo, testRun.id)
      } else {
        await fetchTestCasesForRepo(selectedRepo)
      }
    } catch {
      setError('Network error during single test execution.')
    } finally {
      setRunningRowMap((prev) => ({ ...prev, [dbId]: false }))
    }
  }

  const isRealRepoSelected = Boolean(selectedRepo)
  const activeCasesSource: FormattedTestCase[] = isRealRepoSelected ? realTestCases : (mockTestCases as any)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activeCasesSource.filter((c) => {
      const matchesFilter = filter === 'All' || c.type.toLowerCase() === filter.toLowerCase() || c.feature.toLowerCase().includes(filter.toLowerCase())
      const matchesQuery =
        !q || c.test.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.feature.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [activeCasesSource, filter, query])

  const toggleSelectRow = (dbId: string) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev)
      if (next.has(dbId)) next.delete(dbId)
      else next.add(dbId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedCaseIds.size === rows.length) {
      setSelectedCaseIds(new Set())
    } else {
      setSelectedCaseIds(new Set(rows.map((r) => r.dbId).filter(Boolean)))
    }
  }

  return (
    <>
      {/* Top Action & Selector Controls */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="repo-select" className="text-[12.5px] font-semibold text-muted-foreground">
            Repository:
          </label>
          <select
            id="repo-select"
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="rounded-lg border border-border bg-secondary/80 px-3 py-1.5 font-mono text-[12.5px] font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:bg-secondary"
          >
            {repositories.length === 0 ? (
              <option value="">No repositories connected</option>
            ) : (
              repositories.map((r) => (
                <option key={r.id} value={r.fullName}>
                  {r.fullName} ({r.language || 'JS/TS'})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRealRepoSelected && hasTestPlan === false && (
            <PrimaryButton
              icon={isGeneratingPlan ? RefreshCw : FileText}
              onClick={handleGeneratePlan}
              disabled={!selectedRepo || isGeneratingPlan || isGenerating || isRunningTests || loadingRepos}
              className={cn('shrink-0 px-4 py-2 text-[13px] bg-indigo-600 hover:bg-indigo-500 text-white', isGeneratingPlan && 'opacity-70')}
            >
              {isGeneratingPlan ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="size-3.5 animate-spin" />
                  Generating Test Plan...
                </span>
              ) : (
                'Generate Test Plan'
              )}
            </PrimaryButton>
          )}

          {isRealRepoSelected && rows.length > 0 && (
            <PrimaryButton
              icon={isRunningTests ? RefreshCw : Play}
              onClick={() => handleRunTests(selectedCaseIds.size > 0 ? Array.from(selectedCaseIds) : undefined)}
              disabled={!selectedRepo || isRunningTests || isGenerating || isGeneratingPlan}
              className={cn('shrink-0 px-4 py-2 text-[13px] bg-emerald-600 hover:bg-emerald-500 text-white', isRunningTests && 'opacity-70')}
            >
              {isRunningTests ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="size-3.5 animate-spin" />
                  Running Playwright...
                </span>
              ) : selectedCaseIds.size > 0 ? (
                `Run selected (${selectedCaseIds.size})`
              ) : (
                'Run all tests'
              )}
            </PrimaryButton>
          )}

          <PrimaryButton
            icon={isGenerating ? RefreshCw : Sparkles}
            onClick={handleGenerate}
            disabled={!selectedRepo || isGenerating || isGeneratingPlan || isRunningTests || loadingRepos}
            className={cn('shrink-0 px-4 py-2 text-[13px]', isGenerating && 'opacity-70')}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="size-3.5 animate-spin" />
                Generating AI test cases...
              </span>
            ) : (
              'Generate tests'
            )}
          </PrimaryButton>
        </div>
      </div>

      {/* Error & Success Feedback Banners */}
      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-[13px] text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <span>{error}</span>
          </div>
          {(hasTestPlan === false || error.includes('TestPlan') || error.includes('test_plan')) && (
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={isGeneratingPlan || isGenerating || isRunningTests}
              className="flex items-center gap-1.5 font-semibold text-amber-300 hover:text-amber-100 underline focus:outline-none disabled:opacity-50"
            >
              {isGeneratingPlan ? <RefreshCw className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Generate Test Plan Now
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-[13px] text-emerald-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-[13px] transition-all focus-within:border-primary/50 focus-within:bg-secondary">
          <Search className="size-[15px] text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search test cases..."
            aria-label="Search test cases"
            className="w-44 bg-transparent text-foreground outline-none placeholder:text-muted-foreground sm:w-56"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-secondary/30 p-1">
          {caseFilters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1 text-[12.5px] font-medium transition-all duration-150',
                filter === f
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Test Cases Table Display */}
      <section className="panel scroll-thin overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {isRealRepoSelected && rows.length > 0 && (
                <th scope="col" className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedCaseIds.size === rows.length && rows.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all test cases"
                    className="rounded border-border bg-secondary text-primary focus:ring-primary/50"
                  />
                </th>
              )}
              {['ID', 'Test Case Title', 'Target / Route', 'Priority', 'Type', 'Status', 'Last Run', 'Action'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className={cn(
                    'px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80',
                    h === 'Action' && 'text-right'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-accent/40">
                {isRealRepoSelected && rows.length > 0 && (
                  <td className="px-3 py-3.5 text-center">
                    {c.dbId && (
                      <input
                        type="checkbox"
                        checked={selectedCaseIds.has(c.dbId)}
                        onChange={() => toggleSelectRow(c.dbId)}
                        aria-label={`Select ${c.test}`}
                        className="rounded border-border bg-secondary text-primary focus:ring-primary/50"
                      />
                    )}
                  </td>
                )}
                <td className="px-5 py-3.5 font-mono text-[12.5px] font-semibold text-primary">{c.id}</td>
                <td className="px-5 py-3.5 text-[13px] font-medium text-foreground">
                  <div>{c.test}</div>
                  {c.sourceEvidence && c.sourceEvidence.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.sourceEvidence.slice(0, 2).map((ev) => (
                        <span key={ev} className="font-mono text-[10px] text-muted-foreground/80 bg-secondary/60 rounded px-1.5 py-0.5">
                          {ev.split(':')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5 font-mono text-[12px] text-muted-foreground">{c.feature}</td>
                <td className="px-5 py-3.5">
                  <PriorityBadge priority={c.priority} />
                </td>
                <td className="px-5 py-3.5">
                  <span className="rounded border border-border/80 bg-secondary/50 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                    {c.type}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-5 py-3.5 font-mono text-[12.5px] text-muted-foreground">{c.lastRun}</td>
                <td className="px-5 py-3.5 text-right">
                  {c.dbId ? (
                    <button
                      type="button"
                      onClick={() => handleRunSingleTest(c.dbId)}
                      disabled={Boolean(runningRowMap[c.dbId] || isRunningTests || isGenerating || isGeneratingPlan)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-all shadow-xs',
                        runningRowMap[c.dbId]
                          ? 'bg-secondary text-muted-foreground cursor-not-allowed opacity-75'
                          : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                      )}
                    >
                      {runningRowMap[c.dbId] ? (
                        <>
                          <RefreshCw className="size-3 animate-spin text-emerald-400" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="size-3 text-emerald-400 fill-emerald-400/20" />
                          Run
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}

            {/* Empty State for Real Repository with No Tests */}
            {isRealRepoSelected && rows.length === 0 && !loadingCases && (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <FolderGit2 className="size-8 text-muted-foreground/60" />
                    <p className="font-medium text-foreground">
                      {hasTestPlan === false
                        ? `No Test Plan found for ${selectedRepo}`
                        : `No test cases generated yet for ${selectedRepo}`}
                    </p>
                    <p className="text-[12px] text-muted-foreground max-w-sm text-pretty">
                      {hasTestPlan === false
                        ? 'Generate an AI Test Plan first to define grounded test scenarios for this repository.'
                        : 'Click "Generate tests" above to create grounded executable test cases from your repository TestPlan.'}
                    </p>
                    {hasTestPlan === false ? (
                      <PrimaryButton
                        icon={isGeneratingPlan ? RefreshCw : FileText}
                        onClick={handleGeneratePlan}
                        disabled={isGeneratingPlan || isGenerating}
                        className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        {isGeneratingPlan ? 'Generating Test Plan...' : 'Generate Test Plan'}
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton
                        icon={isGenerating ? RefreshCw : Sparkles}
                        onClick={handleGenerate}
                        disabled={isGenerating || isRunningTests}
                        className="mt-2"
                      >
                        {isGenerating ? 'Generating tests...' : 'Generate tests'}
                      </PrimaryButton>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Loading State */}
            {loadingCases && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-[13px] text-muted-foreground">
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="size-4 animate-spin text-primary" />
                    Loading test cases for {selectedRepo}...
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}
