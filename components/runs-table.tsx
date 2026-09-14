import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { StatusBadge } from '@/components/primitives'
import { recentRuns } from '@/lib/data'

export function RunsTable({
  rows = recentRuns,
  showTrigger = false,
}: {
  rows?: typeof recentRuns
  showTrigger?: boolean
}) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-secondary/30">
            {['Run', 'Repository', ...(showTrigger ? ['Trigger'] : []), 'Tests', 'Passed', 'Failed', 'Duration', 'Status'].map(
              (h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((run) => (
            <tr
              key={run.id}
              className="transition-colors hover:bg-accent/40"
            >
              <td className="px-5 py-3.5">
                <Link
                  href="/test-runs"
                  className="font-mono text-[12.5px] font-semibold text-primary transition-opacity hover:opacity-80"
                >
                  {run.id}
                </Link>
              </td>
              <td className="px-5 py-3.5">
                <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                  <GitBranch className="size-3.5 text-muted-foreground" />
                  {run.repository}
                </span>
              </td>
              {showTrigger && (
                <td className="px-5 py-3.5 text-[12.5px] text-muted-foreground">{run.trigger}</td>
              )}
              <td className="px-5 py-3.5 font-mono text-[13px] tabular-nums text-foreground">{run.tests}</td>
              <td className="px-5 py-3.5 font-mono text-[13px] font-semibold tabular-nums text-success">
                {run.passed}
              </td>
              <td className="px-5 py-3.5 font-mono text-[13px] font-semibold tabular-nums text-destructive">
                {run.failed}
              </td>
              <td className="px-5 py-3.5 font-mono text-[12.5px] text-muted-foreground">
                {run.duration}
              </td>
              <td className="px-5 py-3.5">
                <StatusBadge status={run.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

