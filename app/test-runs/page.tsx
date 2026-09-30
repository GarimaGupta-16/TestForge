import Link from 'next/link'
import { Activity, Clock, Play, Terminal } from 'lucide-react'
import { PageHeader, Panel, PrimaryButton } from '@/components/primitives'
import { RunsTable, type FormattedRunRow } from '@/components/runs-table'
import { getUserTestRuns } from '@/lib/db/test-runs'
import { getRepositories } from '@/lib/db/repositories'
import { RepositoryFilter } from '@/components/repository-filter'
import { TestRunsAutoRefresher } from '@/components/test-runs-auto-refresher'
import { isTodayInAppTimezone } from '@/lib/utils/date'

export const metadata = { title: 'Test Runs · TestForge' }

function formatDurationSeconds(sec: number): string {
  if (sec <= 0) return '0s'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

interface TestRunsPageProps {
  searchParams: Promise<{ repo?: string }>
}

export default async function TestRunsPage({ searchParams }: TestRunsPageProps) {
  const { repo: selectedRepoId } = await searchParams
  const repositories = await getRepositories()
  const runs = await getUserTestRuns(selectedRepoId)

  // Calculate dynamic metrics from real runs using application local timezone (Asia/Kolkata)
  const runsToday = runs.filter((r) => isTodayInAppTimezone(r.started_at)).length

  const completedRuns = runs.filter((r) => r.duration_seconds > 0)
  const avgDurationSeconds =
    completedRuns.length > 0
      ? Math.round(completedRuns.reduce((acc, r) => acc + r.duration_seconds, 0) / completedRuns.length)
      : 0

  const runningCount = runs.filter((r) => r.status === 'running').length

  const summary = [
    {
      label: 'Runs today',
      value: String(runsToday),
      hint: runsToday === 1 ? '1 test run executed today' : `${runsToday} test runs executed today`,
    },
    {
      label: 'Avg duration',
      value: formatDurationSeconds(avgDurationSeconds),
      hint: completedRuns.length > 0 ? `Across ${completedRuns.length} completed runs` : 'No completed runs',
    },
    {
      label: 'Currently running',
      value: String(runningCount),
      hint: runningCount === 1 ? '1 active suite executing' : `${runningCount} active suites executing`,
    },
    {
      label: 'Queued',
      value: '0',
      hint: 'No queued test suites',
    },
  ]

  const formattedRows: FormattedRunRow[] = runs.map((run) => {
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

  const latestRun = runs.length > 0 ? runs[0] : null
  const logLines = latestRun
    ? [
        {
          t: latestRun.started_at
            ? new Date(latestRun.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '00:00:00',
          text: `Execution started · Trigger: ${latestRun.trigger_type || 'manual'}`,
        },
        {
          t: latestRun.started_at
            ? new Date(latestRun.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '00:00:00',
          text: `Repository: ${latestRun.repository?.full_name || 'Connected App'} (${latestRun.branch || 'main'})`,
        },
        {
          t: latestRun.started_at
            ? new Date(latestRun.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '00:00:00',
          text: `Target commit SHA: ${latestRun.commit_sha ? latestRun.commit_sha.slice(0, 7) : 'HEAD'}`,
        },
        {
          t: latestRun.started_at
            ? new Date(latestRun.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '00:00:00',
          text: `Suite size: ${latestRun.total_tests} test cases`,
        },
        {
          t: latestRun.completed_at
            ? new Date(latestRun.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : 'In Progress',
          text: `Execution ${latestRun.status} in ${formatDurationSeconds(latestRun.duration_seconds)} · Passed: ${latestRun.passed_tests}, Failed: ${latestRun.failed_tests}, Skipped: ${latestRun.skipped_tests}`,
        },
      ]
    : []

  return (
    <>
      <TestRunsAutoRefresher hasRunning={runningCount > 0} />
      <PageHeader
        crumb="Test runs"
        title="Test runs"
        description="Live execution history across every connected application."
        action={
          <Link href="/test-cases">
            <PrimaryButton icon={Play}>Run latest tests</PrimaryButton>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <article key={item.label} className="panel p-5 transition-all duration-150 hover:border-border-strong">
            <p className="text-[12.5px] font-medium text-muted-foreground">{item.label}</p>
            <p className="mt-3 text-3xl font-bold leading-none tracking-tight font-mono text-foreground">
              {item.value}
            </p>
            <p className="mt-3 text-[11.5px] text-muted-foreground">{item.hint}</p>
          </article>
        ))}
      </div>

      <section className="panel mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              <Activity className="size-3.5 text-primary" />
              Execution history
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-foreground">
              {selectedRepoId ? 'Filtered runs' : 'All runs'}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {runningCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info/10 px-2.5 py-0.5 text-[11.5px] font-medium text-info">
                <span className="size-1.5 animate-pulse rounded-full bg-info" />
                {runningCount} running
              </span>
            )}
            <RepositoryFilter repositories={repositories} selectedRepoId={selectedRepoId} />
          </div>
        </div>
        {runs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {selectedRepoId
                ? 'No test runs found for the selected repository. Navigate to Test Cases to trigger an automated test suite.'
                : 'No test runs found. Navigate to Test Cases to trigger an automated test suite.'}
            </p>
          </div>
        ) : (
          <RunsTable rows={formattedRows} showTrigger />
        )}
      </section>

      <Panel
        eyebrow="Live output"
        eyebrowIcon={Terminal}
        title={
          latestRun
            ? `#${latestRun.id.slice(0, 8)} · ${latestRun.repository?.full_name || latestRun.repository?.name || 'Repository'}`
            : 'Execution Log'
        }
      >
        {logLines.length === 0 ? (
          <div className="rounded-lg border border-border bg-[#070b12] p-6 text-center font-mono text-[12px] text-muted-foreground">
            No execution logs recorded yet.
          </div>
        ) : (
          <ul className="scroll-thin max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border bg-[#070b12] p-4 font-mono text-[12px] leading-relaxed">
            {logLines.map((line, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="shrink-0 text-muted-foreground/60">{line.t}</span>
                <span className="text-foreground/90">{line.text}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <Clock className="size-3.5 text-primary" />
          {latestRun ? `Execution status: ${latestRun.status.toUpperCase()}` : 'Awaiting test suite execution.'}
        </p>
      </Panel>
    </>
  )
}

