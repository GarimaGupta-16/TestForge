'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react'
import { StatusBadge } from '@/components/primitives'
import type { FormattedRunRow } from '@/components/runs-table'

interface RunDetailsSheetProps {
  run: FormattedRunRow | null
  onClose: () => void
}

interface TestRunDetail {
  id: string
  repository_id: string
  status: string
  trigger_type: string | null
  branch: string | null
  commit_sha: string | null
  total_tests: number
  passed_tests: number
  failed_tests: number
  skipped_tests: number
  duration_seconds: number
  started_at: string | null
  completed_at: string | null
  error_summary: string | null
}

interface TestResultDetail {
  id: string
  test_run_id: string
  test_case_id: string | null
  test_title: string
  status: string
  duration_ms: number | null
  error_message: string | null
  stack_trace: string | null
  created_at: string
}

interface TestArtifactDetail {
  id: string
  test_result_id: string
  type: string
  file_name: string
  storage_path: string
  mime_type: string
  file_size_bytes: number
  created_at: string
}

function formatDuration(sec: number): string {
  if (sec <= 0) return '0s'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function RunDetailsSheet({ run, onClose }: RunDetailsSheetProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testRun, setTestRun] = useState<TestRunDetail | null>(null)
  const [results, setResults] = useState<TestResultDetail[]>([])
  const [artifacts, setArtifacts] = useState<TestArtifactDetail[]>([])
  const [copiedId, setCopiedId] = useState(false)
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({})

  const pollCountRef = useRef(0)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDetails = useCallback(async (isSilent = false) => {
    if (!run) return

    const repoFullName = run.repositoryFullName || run.repository
    if (!repoFullName || !repoFullName.includes('/')) {
      setError('Unable to parse repository path for details.')
      setLoading(false)
      return
    }

    const [owner, repo] = repoFullName.split('/')
    if (!isSilent) {
      setLoading(true)
      setError(null)
    }

    try {
      const res = await fetch(
        `/api/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/test-runs/${encodeURIComponent(run.id)}`
      )
      if (!res.ok) {
        throw new Error(`Failed to fetch run details (${res.status})`)
      }

      const data = await res.json()
      setTestRun(data.testRun || null)
      setResults(data.results || [])
      setArtifacts(data.artifacts || [])
      setError(null)

      // Auto expand failed results by default
      if (data.results && Array.isArray(data.results)) {
        const failedMap: Record<string, boolean> = {}
        data.results.forEach((r: TestResultDetail) => {
          if (r.status === 'failed') {
            failedMap[r.id] = true
          }
        })
        setExpandedResults((prev) => ({ ...failedMap, ...prev }))
      }
    } catch (err: any) {
      if (!isSilent) {
        setError(err.message || 'Failed to load test run details.')
      }
    } finally {
      if (!isSilent) {
        setLoading(false)
      }
    }
  }, [run])

  // Reset state and fetch details when run changes
  useEffect(() => {
    if (!run) {
      setTestRun(null)
      setResults([])
      setArtifacts([])
      setError(null)
      setLoading(false)
      return
    }

    pollCountRef.current = 0
    fetchDetails(false)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [run, fetchDetails])

  // Bounded polling for running status
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }

    if (testRun?.status === 'running') {
      pollTimerRef.current = setInterval(() => {
        pollCountRef.current += 1
        if (pollCountRef.current >= 30) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          return
        }
        fetchDetails(true)
      }, 2000)
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [testRun?.status, fetchDetails])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && run) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [run, onClose])

  if (!run) return null

  const repoFullName = run.repositoryFullName || run.repository
  const [owner, repo] = repoFullName.includes('/') ? repoFullName.split('/') : ['', '']

  const handleCopyId = () => {
    if (run.id) {
      navigator.clipboard.writeText(run.id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    }
  }

  const toggleExpand = (resultId: string) => {
    setExpandedResults((prev) => ({
      ...prev,
      [resultId]: !prev[resultId],
    }))
  }

  const screenshotArtifacts = artifacts.filter((a) => a.type === 'screenshot')
  const otherArtifacts = artifacts.filter((a) => a.type !== 'screenshot')

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close details panel"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
      />

      {/* Sheet panel */}
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200 z-50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Activity className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                Run details
              </p>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-base font-bold text-foreground tracking-tight">
                  #{run.id.slice(0, 8)}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Copy full Run ID"
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  {copiedId ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                  <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label="Close panel"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="scroll-thin flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Loading execution details...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-destructive">
              <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                <AlertCircle className="size-4" />
                <span>Error loading details</span>
              </div>
              <p className="text-xs text-destructive/90">{error}</p>
              <button
                type="button"
                onClick={() => fetchDetails(false)}
                className="mt-3 inline-flex items-center gap-1.5 rounded bg-destructive/20 px-3 py-1.5 text-xs font-semibold hover:bg-destructive/30 transition-colors"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
            </div>
          ) : testRun ? (
            <>
              {/* Repository & Overview Metadata Card */}
              <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <GitBranch className="size-4 text-primary" />
                    <span>{repoFullName}</span>
                  </div>
                  <StatusBadge status={testRun.status as any} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12.5px]">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Trigger</span>
                    <span className="font-medium text-foreground">{testRun.trigger_type || 'manual'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Branch</span>
                    <span className="font-mono text-foreground">{testRun.branch || 'main'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Commit</span>
                    <span className="font-mono text-foreground">
                      {testRun.commit_sha ? testRun.commit_sha.slice(0, 7) : 'HEAD'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Started</span>
                    <span className="text-foreground">
                      {testRun.started_at ? new Date(testRun.started_at).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Completed</span>
                    <span className="text-foreground">
                      {testRun.completed_at ? new Date(testRun.completed_at).toLocaleTimeString() : 'In Progress'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">Duration</span>
                    <span className="font-mono font-semibold text-foreground">
                      {formatDuration(testRun.duration_seconds)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Counts Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground">Total</p>
                  <p className="mt-1 font-mono text-xl font-bold text-foreground">{testRun.total_tests}</p>
                </div>
                <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-center">
                  <p className="text-[11px] font-medium text-success">Passed</p>
                  <p className="mt-1 font-mono text-xl font-bold text-success">{testRun.passed_tests}</p>
                </div>
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center">
                  <p className="text-[11px] font-medium text-destructive">Failed</p>
                  <p className="mt-1 font-mono text-xl font-bold text-destructive">{testRun.failed_tests}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground">Skipped</p>
                  <p className="mt-1 font-mono text-xl font-bold text-muted-foreground">{testRun.skipped_tests}</p>
                </div>
              </div>

              {/* Error Summary Alert if present */}
              {testRun.error_summary && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive mb-1">
                    <AlertTriangle className="size-3.5" />
                    Suite Error Summary
                  </p>
                  <p className="text-xs font-mono whitespace-pre-wrap">{testRun.error_summary}</p>
                </div>
              )}

              {/* Test Results Breakdown */}
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                  Test Case Results ({results.length})
                </h3>

                {results.length === 0 ? (
                  <div className="rounded-lg border border-border bg-secondary/20 p-4 text-center text-xs text-muted-foreground">
                    No individual test case results recorded.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {results.map((res) => {
                      const isExpanded = !!expandedResults[res.id]
                      const hasError = !!(res.error_message || res.stack_trace)

                      return (
                        <div
                          key={res.id}
                          className="rounded-lg border border-border bg-secondary/20 overflow-hidden transition-all"
                        >
                          <div
                            onClick={() => hasError && toggleExpand(res.id)}
                            className={`flex items-center justify-between gap-3 px-4 py-3 ${
                              hasError ? 'cursor-pointer hover:bg-secondary/40' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {hasError ? (
                                isExpanded ? (
                                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                                )
                              ) : res.status === 'passed' ? (
                                <CheckCircle2 className="size-4 text-success shrink-0" />
                              ) : (
                                <XCircle className="size-4 text-destructive shrink-0" />
                              )}
                              <span className="text-xs font-medium text-foreground truncate">
                                {res.test_title}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {res.duration_ms !== null && (
                                <span className="font-mono text-[11.5px] text-muted-foreground">
                                  {(res.duration_ms / 1000).toFixed(2)}s
                                </span>
                              )}
                              <StatusBadge status={res.status as any} />
                            </div>
                          </div>

                          {/* Expanded Error Details */}
                          {hasError && isExpanded && (
                            <div className="border-t border-border/60 bg-background/50 p-4 space-y-3 text-xs">
                              {res.error_message && (
                                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                                  <p className="font-semibold text-[11px] uppercase tracking-wider mb-1">
                                    Error Message
                                  </p>
                                  <p className="font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">
                                    {res.error_message}
                                  </p>
                                </div>
                              )}

                              {res.stack_trace && (
                                <div>
                                  <p className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                                    Stack Trace
                                  </p>
                                  <pre className="scroll-thin max-h-60 overflow-x-auto rounded-md border border-border bg-[#070b12] p-3 font-mono text-[11px] text-foreground/90 leading-relaxed">
                                    {res.stack_trace}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Artifacts Gallery */}
              <div className="space-y-3 pt-2">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground/90">
                  Execution Artifacts ({artifacts.length})
                </h3>

                {artifacts.length === 0 ? (
                  <div className="rounded-lg border border-border bg-secondary/20 p-4 text-center text-xs text-muted-foreground">
                    No artifacts captured for this run.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Screenshots */}
                    {screenshotArtifacts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                          <ImageIcon className="size-3.5 text-primary" />
                          Screenshots ({screenshotArtifacts.length})
                        </p>
                        <div className="grid gap-3">
                          {screenshotArtifacts.map((art) => {
                            const artifactUrl = `/api/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/test-runs/${encodeURIComponent(run.id)}/artifacts/${encodeURIComponent(art.file_name)}`

                            return (
                              <div
                                key={art.id}
                                className="group relative overflow-hidden rounded-lg border border-border bg-black/40 p-2 transition-all hover:border-primary/50"
                              >
                                <div className="relative max-h-80 w-full overflow-hidden rounded bg-black/60 flex items-center justify-center">
                                  <img
                                    src={artifactUrl}
                                    alt={`Execution artifact screenshot: ${art.file_name}`}
                                    className="max-h-80 w-full object-contain cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
                                    onClick={() => window.open(artifactUrl, '_blank')}
                                  />
                                </div>
                                <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                                  <span className="font-mono truncate max-w-[320px]">{art.file_name}</span>
                                  <div className="flex items-center gap-2">
                                    <span>{formatBytes(art.file_size_bytes)}</span>
                                    <a
                                      href={artifactUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                      <span>View</span>
                                      <ExternalLink className="size-3" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Non-screenshot artifacts */}
                    {otherArtifacts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                          <FileText className="size-3.5 text-muted-foreground" />
                          Other Artifacts ({otherArtifacts.length})
                        </p>
                        <div className="grid gap-2">
                          {otherArtifacts.map((art) => (
                            <div
                              key={art.id}
                              className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 px-3.5 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="size-4 text-muted-foreground shrink-0" />
                                <span className="font-mono text-foreground truncate">{art.file_name}</span>
                                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                                  {art.type}
                                </span>
                              </div>
                              <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                                {formatBytes(art.file_size_bytes)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No detailed data found for this test run.
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
