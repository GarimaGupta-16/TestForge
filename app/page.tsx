import Link from 'next/link'
import { Activity, ArrowUpRight, ChevronRight, Plus } from 'lucide-react'
import { GhostButton, PrimaryButton } from '@/components/primitives'
import { PipelineStrip, StatCards } from '@/components/dashboard/stat-cards'
import { AgentActivity, TestHealth } from '@/components/dashboard/health-activity'
import { RunsTable } from '@/components/runs-table'
import { recentRuns } from '@/lib/data'

export default function DashboardPage() {
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
            Good evening, Garima
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted-foreground">
            Here&apos;s what your applications and tests are doing today.
          </p>
        </div>
        <Link href="/repositories">
          <PrimaryButton icon={Plus}>Analyze repository</PrimaryButton>
        </Link>
      </div>

      <PipelineStrip />
      <StatCards />

      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <TestHealth />
        <AgentActivity />
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
        <RunsTable rows={recentRuns.slice(0, 4)} />
      </section>
    </>
  )
}

