import Link from 'next/link'
import { BarChart3, Flame, Play, TrendingUp, Activity, Wrench } from 'lucide-react'
import { Meter, PageHeader, Panel, PrimaryButton } from '@/components/primitives'
import { getUserTestCases } from '@/lib/db/test-cases'
import { getUserTestRuns } from '@/lib/db/test-runs'
import { getUserFailures } from '@/lib/db/failures'
import { getUserAppliedAiRepairs } from '@/lib/db/ai-repairs'
import { getLocalDateString } from '@/lib/utils/date'

export const metadata = { title: 'Test Insights · TestForge' }
export const dynamic = 'force-dynamic'

function formatDurationSeconds(sec: number): string {
  if (sec <= 0) return '0s'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const CATEGORY_NAMES: Record<string, string> = {
  e2e: 'End-to-End',
  auth: 'Authentication',
  authentication: 'Authentication',
  navigation: 'Navigation',
  forms: 'Forms',
  quiz: 'Quiz Creation',
  'quiz creation': 'Quiz Creation',
  regression: 'Regression',
  visual: 'Visual UI',
}

function formatCategoryName(cat: string): string {
  const lower = cat.toLowerCase().trim()
  if (CATEGORY_NAMES[lower]) return CATEGORY_NAMES[lower]
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}

export default async function TestInsightsPage() {
  const testCases = await getUserTestCases()
  const runs = await getUserTestRuns()
  const failures = await getUserFailures()
  const appliedRepairsList = await getUserAppliedAiRepairs()

  // 1. Stat Card 1: Pass Rate
  const totalTestCases = testCases.length
  const passingTestCases = testCases.filter((c) => c.status === 'passing').length
  const passRateVal = totalTestCases > 0 ? Math.round((passingTestCases / totalTestCases) * 1000) / 10 : 0
  const passRateDisplay = `${passRateVal}%`

  // 2. Stat Card 2: Mean Duration
  const completedRuns = runs.filter((r) => r.duration_seconds > 0)
  const avgDurationSeconds =
    completedRuns.length > 0
      ? Math.round(completedRuns.reduce((acc, r) => acc + r.duration_seconds, 0) / completedRuns.length)
      : 0
  const meanDurationDisplay = completedRuns.length > 0 ? formatDurationSeconds(avgDurationSeconds) : '—'
  const meanDurationSubtitle =
    completedRuns.length > 0
      ? `Across ${completedRuns.length} completed ${completedRuns.length === 1 ? 'run' : 'runs'}`
      : 'No completed runs'

  // 3. Stat Card 3: Flake Rate
  const flakeRateDisplay = 'N/A'
  const flakeRateSubtitle = 'Needs more repeated executions'

  // 4. Stat Card 4: Auto Repairs (sourced directly from ai_repairs where status === 'applied')
  const autoRepairsDisplay = String(appliedRepairsList.length)

  const insightCards = [
    {
      label: 'Pass rate',
      value: passRateDisplay,
      subtitle: 'Current generated test health',
      icon: TrendingUp,
      tone: 'text-success',
    },
    {
      label: 'Mean duration',
      value: meanDurationDisplay,
      subtitle: meanDurationSubtitle,
      icon: Activity,
      tone: 'text-foreground',
    },
    {
      label: 'Flake rate',
      value: flakeRateDisplay,
      subtitle: flakeRateSubtitle,
      icon: Flame,
      tone: 'text-muted-foreground',
    },
    {
      label: 'Auto-repairs',
      value: autoRepairsDisplay,
      subtitle: 'Applied & verified AI repairs',
      icon: Wrench,
      tone: 'text-primary',
    },
  ]

  // Pass Rate Trend Series: map actual completed runs ordered by started_at ASC
  const runsWithTests = runs.filter((r) => r.total_tests > 0)
  const sortedRuns = [...runsWithTests]
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    .slice(-7)

  const trendSeries = sortedRuns.map((r) => {
    const pass = Math.round((r.passed_tests / r.total_tests) * 100)
    const fail = Math.max(0, 100 - pass)
    const label = r.started_at ? getLocalDateString(r.started_at).slice(5) : `#${r.id.slice(0, 4)}`
    return { id: r.id, label, pass, fail }
  })

  // Instability / Failing Tests List
  const failingCases = failures.map((f) => ({
    id: f.id.slice(0, 8),
    title: f.title,
    repository: f.repository?.full_name || f.repository?.name || 'Repository',
  }))

  // Tests per Feature / Category Distribution
  const categoryMap = new Map<string, { name: string; total: number }>()
  for (const tc of testCases) {
    const rawCat = tc.category || 'e2e'
    const catName = formatCategoryName(rawCat)
    const existing = categoryMap.get(catName) || { name: catName, total: 0 }
    existing.total += 1
    categoryMap.set(catName, existing)
  }
  const featureDistribution = Array.from(categoryMap.values())
  const maxCategoryTotal = Math.max(...featureDistribution.map((f) => f.total), 1)

  return (
    <>
      <PageHeader
        crumb="Test insights"
        title="Test insights"
        description="Trends, execution metrics and quality signals across your applications."
        action={
          <Link href="/test-cases">
            <PrimaryButton icon={Play}>Run latest tests</PrimaryButton>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {insightCards.map((item) => (
          <article key={item.label} className="panel p-5 transition-all duration-150 hover:border-border-strong">
            <p className="text-[12.5px] font-medium text-muted-foreground">{item.label}</p>
            <p className={`mt-3 text-3xl font-bold leading-none tracking-tight font-mono ${item.tone}`}>
              {item.value}
            </p>
            <p className="mt-3 text-[11.5px] font-medium text-muted-foreground">
              {item.subtitle}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          eyebrow="Recent execution history"
          eyebrowIcon={BarChart3}
          title="Pass rate trend"
          className="lg:col-span-3"
        >
          {trendSeries.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm font-medium text-muted-foreground">
              No test run history available for trend visualization.
            </div>
          ) : (
            <div className="flex h-56 items-end gap-3 pt-4">
              {trendSeries.map((d) => (
                <div key={d.id} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] font-semibold font-mono tabular-nums text-muted-foreground">
                    {d.pass}%
                  </span>
                  <div className="flex w-full max-w-[42px] flex-1 flex-col justify-end overflow-hidden rounded-md bg-secondary/60 border border-border/50">
                    <div
                      className="w-full shrink-0 bg-destructive/60 transition-all duration-300"
                      style={{ height: `${d.fail}%` }}
                      aria-hidden="true"
                    />
                    <div
                      className="w-full shrink-0 bg-success transition-all duration-300"
                      style={{ height: `${d.pass}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground truncate w-full text-center">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex items-center gap-5 border-t border-border/60 pt-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" /> Passed
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-destructive/60" /> Failed
            </span>
          </div>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <Panel eyebrow="Instability" eyebrowIcon={Flame} title="Failing & open issues">
            {failingCases.length === 0 ? (
              <div className="py-6 text-center text-xs font-medium text-muted-foreground">
                No unstable or failing tests detected.
              </div>
            ) : (
              <ul className="space-y-3 pt-1">
                {failingCases.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <span className="w-[74px] shrink-0 font-mono text-[11.5px] font-semibold text-primary">
                      #{t.id}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-foreground">
                      {t.title}
                    </span>
                    <span className="shrink-0 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-destructive">
                      Open
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel eyebrow="Distribution" eyebrowIcon={BarChart3} title="Tests per feature">
            {featureDistribution.length === 0 ? (
              <div className="py-6 text-center text-xs font-medium text-muted-foreground">
                No feature distribution data available.
              </div>
            ) : (
              <ul className="space-y-3.5 pt-1">
                {featureDistribution.map((f) => (
                  <li key={f.name}>
                    <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                      <span className="font-medium text-foreground">{f.name}</span>
                      <span className="font-mono tabular-nums text-muted-foreground">{f.total}</span>
                    </div>
                    <Meter value={(f.total / maxCategoryTotal) * 100} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}

