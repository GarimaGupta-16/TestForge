import { Activity, ArrowUpRight, ChevronRight, Plus } from 'lucide-react'
import { GhostButton, PrimaryButton } from '@/components/primitives'
import { PipelineStrip, StatCards } from '@/components/dashboard/stat-cards'
import { AgentActivity, TestHealth } from '@/components/dashboard/health-activity'
import { RunsTable } from '@/components/runs-table'
import { recentRuns } from '@/lib/data'

export default function DashboardPage() {
  return (
    <>
      <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <span>Workspace</span>
            <ChevronRight className="size-3.5 text-muted-foreground/60" />
            <span>Overview</span>
          </div>
          <h1 className="text-[27px] font-semibold leading-tight">Good evening, Garima</h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            Here&apos;s what your applications and tests are doing today.
          </p>
        </div>
        <PrimaryButton icon={Plus}>Analyze repository</PrimaryButton>
      </div>

      <PipelineStrip />
      <StatCards />

      <div className="mb-6 grid gap-4 lg:grid-cols-5">
        <TestHealth />
        <AgentActivity />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-5">
          <div>
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Activity className="size-3.5" />
              Execution log
            </p>
            <h2 className="mt-2 text-[17px] font-semibold">Recent test runs</h2>
          </div>
          <GhostButton icon={ArrowUpRight}>View all</GhostButton>
        </div>
        <RunsTable rows={recentRuns.slice(0, 4)} />
      </section>
    </>
  )
}
