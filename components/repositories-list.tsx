'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowUpRight, Plus, Sparkles, AlertTriangle, RefreshCw, FolderGit2, CheckCircle2, Globe } from 'lucide-react'
import { GithubMark } from '@/components/github-mark'
import { GhostButton, PrimaryButton } from '@/components/primitives'
import type { GitHubRepositoryMetadata } from '@/lib/github/types'

interface RepositoriesListProps {
  initialRepositories?: GitHubRepositoryMetadata[]
}

export function RepositoriesList({ initialRepositories = [] }: RepositoriesListProps) {
  const [repositories, setRepositories] = useState<GitHubRepositoryMetadata[]>(initialRepositories)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [analyzingMap, setAnalyzingMap] = useState<Record<string, boolean>>({})
  const [analysisDataMap, setAnalysisDataMap] = useState<Record<string, any>>({})
  const [analysisErrorMap, setAnalysisErrorMap] = useState<Record<string, string>>({})

  const [urlEditMap, setUrlEditMap] = useState<Record<string, string>>({})
  const [savingUrlMap, setSavingUrlMap] = useState<Record<string, boolean>>({})
  const [urlErrorMap, setUrlErrorMap] = useState<Record<string, string>>({})
  const [urlSuccessMap, setUrlSuccessMap] = useState<Record<string, string>>({})

  const handleSaveTargetUrl = async (fullName: string) => {
    const [owner, repo] = fullName.split('/')
    if (!owner || !repo) return

    const rawUrl = urlEditMap[fullName] !== undefined ? urlEditMap[fullName] : ''
    setSavingUrlMap((prev) => ({ ...prev, [fullName]: true }))
    setUrlErrorMap((prev) => ({ ...prev, [fullName]: '' }))
    setUrlSuccessMap((prev) => ({ ...prev, [fullName]: '' }))

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/target-url`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ targetUrl: rawUrl }),
      })

      const data = await res.json()
      if (!res.ok) {
        setUrlErrorMap((prev) => ({ ...prev, [fullName]: data.message || 'Validation failed.' }))
        return
      }

      setUrlSuccessMap((prev) => ({
        ...prev,
        [fullName]: data.targetUrl ? 'Target URL saved successfully!' : 'Target URL cleared. Using MVP fallback.',
      }))

      // Refresh repository data in background
      await fetchRepositories()
    } catch (err: any) {
      setUrlErrorMap((prev) => ({ ...prev, [fullName]: err?.message || 'Failed to save target URL.' }))
    } finally {
      setSavingUrlMap((prev) => ({ ...prev, [fullName]: false }))
    }
  }

  const fetchRepositories = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/github/repositories', {
        headers: { 'Cache-Control': 'no-cache' },
      })

      if (!res.ok) {
        if (res.status === 401) {
          setError('Please sign in to view your connected GitHub repositories.')
        } else if (res.status === 404) {
          setError('No active GitHub App installation found. Click "Connect repository" to grant access.')
        } else {
          setError('Failed to load GitHub repositories. Please try again.')
        }
        setRepositories([])
        setLoading(false)
        return
      }

      const data = await res.json()
      const repos: GitHubRepositoryMetadata[] = data.repositories || []
      setRepositories(repos)

      // Fetch persisted analysis for each repo
      for (const r of repos) {
        try {
          const [owner, repoName] = r.fullName.split('/')
          if (owner && repoName) {
            const analysisRes = await fetch(`/api/github/repositories/${owner}/${repoName}/analysis`, {
              headers: { 'Cache-Control': 'no-cache' },
            })
            if (analysisRes.ok) {
              const analysisJson = await analysisRes.json()
              if (analysisJson?.analysis) {
                setAnalysisDataMap((prev) => ({ ...prev, [r.fullName]: analysisJson.analysis }))
              }
            }
          }
        } catch {
          // Ignore individual fetch errors
        }
      }
    } catch (err) {
      setError('Network error checking GitHub repositories.')
      setRepositories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRepositories()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRepositories()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchRepositories])

  const handleAnalyze = async (fullName: string) => {
    const [owner, repo] = fullName.split('/')
    if (!owner || !repo) return

    setAnalyzingMap((prev) => ({ ...prev, [fullName]: true }))
    setAnalysisErrorMap((prev) => ({ ...prev, [fullName]: '' }))

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        setAnalysisErrorMap((prev) => ({
          ...prev,
          [fullName]: errJson?.message || 'Failed to analyze repository. Please try again.',
        }))
        return
      }

      const data = await res.json()
      if (data.success && data.analysis) {
        setAnalysisDataMap((prev) => ({ ...prev, [fullName]: data.analysis }))
      }
    } catch (err) {
      setAnalysisErrorMap((prev) => ({
        ...prev,
        [fullName]: 'Network error while analyzing repository.',
      }))
    } finally {
      setAnalyzingMap((prev) => ({ ...prev, [fullName]: false }))
    }
  }

  if (loading && repositories.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="panel flex flex-col p-5 animate-pulse">
            <div className="flex items-start justify-between">
              <div className="size-9 rounded-lg bg-secondary/80" />
              <div className="h-5 w-20 rounded-full bg-secondary/80" />
            </div>
            <div className="mt-4 h-6 w-3/4 rounded bg-secondary/80" />
            <div className="mt-2 h-4 w-1/2 rounded bg-secondary/80" />
            <div className="mt-3 flex gap-2">
              <div className="h-5 w-16 rounded bg-secondary/80" />
              <div className="h-5 w-16 rounded bg-secondary/80" />
            </div>
            <div className="mt-6 space-y-3 border-t border-border/60 pt-4">
              <div className="h-4 w-full rounded bg-secondary/80" />
              <div className="h-4 w-full rounded bg-secondary/80" />
              <div className="h-4 w-full rounded bg-secondary/80" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-muted-foreground">
          {repositories.length} {repositories.length === 1 ? 'repository' : 'repositories'} connected
        </div>
        <button
          onClick={fetchRepositories}
          disabled={loading}
          className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors focus:outline-none"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Syncing...' : 'Sync repositories'}</span>
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-[13px] text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRepositories}
            className="flex items-center gap-1.5 font-medium hover:underline focus:outline-none"
          >
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        </div>
      )}

      {repositories.length === 0 && !error ? (
        <div className="panel flex flex-col items-center justify-center p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-secondary/80">
            <FolderGit2 className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">No repositories selected</h3>
          <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
            TestForge-Automation has not been granted access to any repositories yet. Click below to choose repositories on GitHub.
          </p>
          <a href="/api/github/connect" target="_blank" rel="noopener noreferrer" className="mt-6">
            <PrimaryButton icon={Plus}>Select repositories on GitHub</PrimaryButton>
          </a>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {repositories.map((repo) => {
            const analysis = analysisDataMap[repo.fullName]
            const isAnalyzing = Boolean(analyzingMap[repo.fullName])
            const analysisError = analysisErrorMap[repo.fullName]

            const techStackTags: string[] = analysis?.techStack || [
              ...(repo.language ? [repo.language] : []),
              repo.isPrivate ? 'Private' : 'Public',
              repo.defaultBranch,
            ]

            return (
              <article
                key={repo.id}
                className="panel flex flex-col p-5 transition-all duration-150 hover:border-border-strong"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/80">
                    <GithubMark className="size-[17px] text-foreground" />
                  </span>
                  {analysis ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11.5px] font-medium text-emerald-400">
                      <CheckCircle2 className="size-3 text-emerald-400" />
                      Analyzed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-muted/50 bg-secondary/80 px-2.5 py-0.5 text-[11.5px] font-medium text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                      Not analyzed
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-lg font-bold text-foreground">{repo.name}</h2>
                <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">{repo.fullName}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {techStackTags.map((tech) => (
                    <span
                      key={tech}
                      className="rounded border border-border/70 bg-secondary/40 px-2 py-0.5 font-mono text-[10.5px] font-medium text-muted-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                {analysisError && (
                  <div className="mt-3 text-[11.5px] text-red-400 border border-red-500/20 bg-red-500/10 rounded p-2">
                    {analysisError}
                  </div>
                )}

                <dl className="mt-5 space-y-2.5 border-t border-border/60 pt-4 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Tests</dt>
                    <dd className="font-semibold font-mono tabular-nums text-muted-foreground">—</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Pass rate</dt>
                    <dd className="font-semibold font-mono tabular-nums text-muted-foreground">—</dd>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <dt className="text-muted-foreground">Routes mapped</dt>
                    <dd className="font-mono tabular-nums text-foreground">
                      {analysis?.metrics?.apiRoutesFound !== undefined || analysis?.metrics?.pageRoutesFound !== undefined
                        ? `${(analysis.metrics?.apiRoutesFound || 0) + (analysis.metrics?.pageRoutesFound || 0)} routes`
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Components</dt>
                    <dd className="font-mono tabular-nums text-foreground">
                      {analysis?.metrics?.componentsAnalyzed !== undefined
                        ? analysis.metrics.componentsAnalyzed
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-mono text-muted-foreground">
                      {analysis ? 'Analyzed' : 'Not analyzed'}
                    </dd>
                  </div>
                </dl>

                {/* Target Application URL Configuration Control */}
                <div className="mt-4 border-t border-border/60 pt-3 text-[12px]">
                  <div className="flex items-center justify-between font-semibold text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Globe className="size-3.5 text-primary shrink-0" />
                      Target Application URL
                    </span>
                    {repo.targetUrl ? (
                      <span className="text-[10.5px] font-mono text-emerald-400">Configured</span>
                    ) : (
                      <span className="text-[10.5px] font-mono text-muted-foreground/80">MVP Fallback (http://localhost:5173)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={urlEditMap[repo.fullName] !== undefined ? urlEditMap[repo.fullName] : (repo.targetUrl || '')}
                      onChange={(e) => {
                        const val = e.target.value
                        setUrlEditMap((prev) => ({ ...prev, [repo.fullName]: val }))
                        setUrlErrorMap((prev) => ({ ...prev, [repo.fullName]: '' }))
                        setUrlSuccessMap((prev) => ({ ...prev, [repo.fullName]: '' }))
                      }}
                      placeholder="https://your-app.example.com"
                      className="flex-1 rounded border border-border bg-background/90 px-2.5 py-1.5 font-mono text-[11.5px] text-foreground outline-none transition-all focus:border-primary/60 focus:bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveTargetUrl(repo.fullName)}
                      disabled={Boolean(savingUrlMap[repo.fullName])}
                      className="rounded bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shrink-0"
                    >
                      {savingUrlMap[repo.fullName] ? <RefreshCw className="size-3.5 animate-spin" /> : 'Save'}
                    </button>
                  </div>

                  {urlErrorMap[repo.fullName] && (
                    <p className="mt-1.5 text-[11px] text-red-400 font-medium">{urlErrorMap[repo.fullName]}</p>
                  )}
                  {urlSuccessMap[repo.fullName] && (
                    <p className="mt-1.5 text-[11px] text-emerald-400 font-medium">{urlSuccessMap[repo.fullName]}</p>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-4">
                  <PrimaryButton
                    icon={isAnalyzing ? RefreshCw : Sparkles}
                    className={`px-3 py-1.5 text-[12.5px] ${isAnalyzing ? 'opacity-70' : ''}`}
                    onClick={() => handleAnalyze(repo.fullName)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="size-3.5 animate-spin" />
                        Analyzing...
                      </span>
                    ) : analysis ? (
                      'Re-analyze'
                    ) : (
                      'Analyze'
                    )}
                  </PrimaryButton>
                  <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">
                    <GhostButton icon={ArrowUpRight}>Open</GhostButton>
                  </a>
                </div>
              </article>
            )
          })}

          <a
            href="/api/github/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong/70 text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary/20 hover:text-foreground"
          >
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-secondary">
              <Plus className="size-5 text-primary" />
            </span>
            <span className="text-[13.5px] font-semibold text-foreground">Connect another repository</span>
            <span className="max-w-[220px] text-center text-[12px] leading-relaxed text-muted-foreground">
              TestForge maps routes and generates a plan within minutes.
            </span>
          </a>
        </div>
      )}
    </div>
  )
}
