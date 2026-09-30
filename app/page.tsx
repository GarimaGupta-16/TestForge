import Link from 'next/link'
import { Activity, ArrowUpRight, ChevronRight, Plus } from 'lucide-react'
import { GhostButton, PrimaryButton } from '@/components/primitives'
import { PipelineStrip, StatCards, type PipelineStepItem, type StatCardItem } from '@/components/dashboard/stat-cards'
import { AgentActivity, TestHealth, type AgentActivityItem } from '@/components/dashboard/health-activity'
import { RunsTable, type FormattedRunRow } from '@/components/runs-table'
import { getRepositories, getUserRepositoryAnalyses } from '@/lib/db/repositories'
import { getUserTestRuns } from '@/lib/db/test-runs'
import { getUserTestCases } from '@/lib/db/test-cases'
import { getUserFailures } from '@/lib/db/failures'
import { createClient } from '@/lib/supabase/server'
import { isTodayInAppTimezone } from '@/lib/utils/date'

export const dynamic = 'force-dynamic'

function formatDurationSeconds(sec: number): string {
  if (sec <= 0) return '0s'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatRelativeTime(dateInput: string | Date | number): string {
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return 'recently'
  const now = new Date()
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userName = 'Garima'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    if (profile?.full_name) {
      userName = profile.full_name.split(' ')[0]
    } else if (user.user_metadata?.full_name) {
      userName = user.user_metadata.full_name.split(' ')[0]
    } else if (user.email) {
      userName = user.email.split('@')[0]
    }
  }

  // Fetch real database records for authenticated user
  const repositories = await getRepositories()
  const runs = await getUserTestRuns()
  const testCases = await getUserTestCases()
  const failures = await getUserFailures()
  const analyses = await getUserRepositoryAnalyses()

  // Real Metrics Calculations (using Asia/Kolkata timezone for local calendar day)
  const runsToday = runs.filter((r) => isTodayInAppTimezone(r.started_at)).length
  const totalRepositories = repositories.length
  const totalTestCases = testCases.length
  const passingTestCases = testCases.filter((tc) => tc.status === 'passing').length
  const failingTestCases = testCases.filter((tc) => tc.status === 'failing').length
  const skippedTestCases = testCases.filter((tc) => tc.status === 'skipped').length

  const passRate = totalTestCases > 0 ? Math.round((passingTestCases / totalTestCases) * 1000) / 10 : 0

  const openFailuresCount = failures.filter(
    (f) => !f.verificationState?.isVerified && f.status !== 'resolved' && f.ai_repair?.status !== 'applied'
  ).length
  const runningRunsCount = runs.filter((r) => r.status === 'running').length

  // Construct real AI Agent Activity items from persisted database events
  const rawActivities: {
    id: string
    title: string
    detail: string
    kind: 'success' | 'error' | 'running' | 'ai'
    timestamp: string
  }[] = []

  // 1. Repository Analysis events
  for (const a of analyses) {
    const repo = repositories.find((r) => r.id === a.repository_id)
    rawActivities.push({
      id: `analysis-${a.id}`,
      title: 'Repository analyzed',
      detail: `${repo?.full_name || repo?.name || 'Repository'} · ${a.components_analyzed || 0} components, ${a.api_routes_found || 0} routes mapped`,
      kind: 'success',
      timestamp: a.analyzed_at || new Date().toISOString(),
    })
  }

  // 2. Test Run events
  for (const r of runs) {
    let title = 'Test run completed'
    let kind: 'success' | 'error' | 'running' | 'ai' = 'success'
    if (r.status === 'running') {
      title = 'Running test suite'
      kind = 'running'
    } else if (r.status === 'failed') {
      title = 'Test run failed'
      kind = 'error'
    } else if (r.status === 'passed') {
      title = 'Test run passed'
      kind = 'success'
    }

    rawActivities.push({
      id: `run-${r.id}`,
      title,
      detail: `${r.repository?.full_name || r.repository?.name || 'Repository'} · ${r.passed_tests} passed, ${r.failed_tests} failed`,
      kind,
      timestamp: r.completed_at || r.started_at || new Date().toISOString(),
    })
  }

  // 3. Failure & AI Repair events
  for (const f of failures) {
    const repoName = f.repository?.full_name || f.repository?.name || 'Repository'

    if (f.ai_repair) {
      const isApplied = f.verificationState?.isVerified || f.ai_repair.status === 'applied'
      rawActivities.push({
        id: `repair-${f.ai_repair.id}`,
        title: isApplied ? 'AI repair verified' : 'AI repair proposed',
        detail: `${repoName} · ${f.title}`,
        kind: isApplied ? 'success' : 'ai',
        timestamp: f.ai_repair.updated_at || f.detected_at,
      })
    } else if (f.ai_analysis) {
      rawActivities.push({
        id: `ai-analysis-${f.ai_analysis.id}`,
        title: 'AI failure analysis completed',
        detail: `${repoName} · ${f.title}`,
        kind: 'ai',
        timestamp: f.ai_analysis.created_at || f.detected_at,
      })
    } else {
      rawActivities.push({
        id: `failure-${f.id}`,
        title: 'Failure detected',
        detail: `${repoName} · ${f.title}`,
        kind: 'error',
        timestamp: f.detected_at,
      })
    }
  }

  // Sort activities by timestamp descending and limit to top 5
  rawActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const recentActivities: AgentActivityItem[] = rawActivities.slice(0, 5).map((act) => ({
    id: act.id,
    title: act.title,
    detail: act.detail,
    time: formatRelativeTime(act.timestamp),
    kind: act.kind,
    timestamp: act.timestamp,
  }))

  const pipelineSteps: PipelineStepItem[] = [
    {
      label: 'Repository',
      value: totalRepositories > 0 ? 'Connected' : 'Not connected',
      icon: 'repo',
    },
    {
      label: 'Intelligence',
      value: analyses.length > 0 ? 'Mapped' : 'Not mapped',
      icon: 'sparkles',
    },
    {
      label: 'Test plan',
      value: totalTestCases > 0 ? 'Ready' : 'Not ready',
      icon: 'checklist',
    },
    {
      label: 'Playwright',
      value: `${totalTestCases} generated`,
      icon: 'code',
    },
    {
      label: 'Browser',
      value: runningRunsCount > 0 ? 'Live session' : runs.length > 0 ? 'Idle' : 'Not started',
      icon: 'pen',
    },
    {
      label: 'Analysis',
      value: openFailuresCount > 0 ? `${openFailuresCount} failures` : 'No issues',
      icon: 'shield',
    },
  ]

  const statCardsItems: StatCardItem[] = [
    {
      label: 'Repositories',
      value: String(totalRepositories),
      delta: totalRepositories === 1 ? '1 repo connected' : `${totalRepositories} repos connected`,
      trend: 'up',
      icon: 'repo',
      tone: 'violet',
    },
    {
      label: 'Tests generated',
      value: String(totalTestCases),
      delta: `${totalTestCases} total specs`,
      trend: 'up',
      icon: 'checklist',
      tone: 'violet',
    },
    {
      label: 'Tests passed',
      value: String(passingTestCases),
      delta: `${passRate}% pass rate`,
      trend: 'up',
      icon: 'shield',
      tone: 'green',
    },
    {
      label: 'Tests failed',
      value: String(failingTestCases),
      delta: failingTestCases === 0 ? '0 failing tests' : `${failingTestCases} need review`,
      trend: failingTestCases > 0 ? 'down' : 'up',
      icon: 'alert',
      tone: 'amber',
    },
  ]

  const recent4Runs = runs.slice(0, 4)
  const formattedRecentRuns: FormattedRunRow[] = recent4Runs.map((run) => {
    let statusLabel = 'Pending'
    if (run.status === 'passed') statusLabel = 'Passed'
    else if (run.status === 'failed') statusLabel = 'Failed'
    else if (run.status === 'running') statusLabel = 'Running'
    else if (run.status === 'skipped') statusLabel = 'Skipped'

    return {
      id: run.id,
      repository: run.repository?.full_name || run.repository?.name || 'Repository',
      repositoryFullName: run.repository?.full_name || run.repository?.name || undefined,
      trigger: run.trigger_type || 'manual',
      tests: run.total_tests,
      passed: run.passed_tests,
      failed: run.failed_tests,
      skipped: run.skipped_tests,
      duration: formatDurationSeconds(run.duration_seconds),
      status: statusLabel,
    }
  })

  return (
    <>
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium tracking-wide text-muted-foreground">
            <span>Workspace</span>
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            <span className="text-foreground/80">Overview</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Good evening, {userName}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">
            Here&apos;s what your applications and tests are doing today.
          </p>
        </div>
        <Link href="/repositories">
          <PrimaryButton icon={Plus}>Analyze repository</PrimaryButton>
        </Link>
      </div>

      <PipelineStrip steps={pipelineSteps} />
      <StatCards items={statCardsItems} />

      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <TestHealth
          passed={passingTestCases}
          failed={failingTestCases}
          skipped={skippedTestCases}
          total={totalTestCases}
          passRate={passRate}
        />
        <AgentActivity items={recentActivities} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              <Activity className="size-3.5 text-primary" />
              Execution log
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-foreground">Recent test runs</h2>
          </div>
          <Link href="/test-runs">
            <GhostButton icon={ArrowUpRight}>View all</GhostButton>
          </Link>
        </div>
        {formattedRecentRuns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No recent test runs recorded. Navigate to Test Cases to execute your first suite.
            </p>
          </div>
        ) : (
          <RunsTable rows={formattedRecentRuns} />
        )}
      </section>
    </>
  )
}

