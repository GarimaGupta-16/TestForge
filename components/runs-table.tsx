'use client'

import { useState } from 'react'
import { GitBranch } from 'lucide-react'
import { StatusBadge } from '@/components/primitives'
import { RunDetailsSheet } from '@/components/run-details-sheet'
import { recentRuns } from '@/lib/data'

export interface FormattedRunRow {
  id: string
  repository: string
  repositoryFullName?: string
  trigger?: string
  tests: number
  passed: number
  failed: number
  skipped?: number
  duration: string
  status: any
}

export function RunsTable({
  rows = recentRuns,
  showTrigger = false,
  onSelectRun,
}: {
  rows?: FormattedRunRow[] | typeof recentRuns
  showTrigger?: boolean
  onSelectRun?: (run: FormattedRunRow) => void
}) {
  const [internalSelectedRun, setInternalSelectedRun] = useState<FormattedRunRow | null>(null)

  const handleSelect = (run: FormattedRunRow) => {
    if (onSelectRun) {
      onSelectRun(run)
    } else {
      setInternalSelectedRun(run)
    }
  }

  return (
    <>
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
                onClick={() => handleSelect(run as FormattedRunRow)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelect(run as FormattedRunRow)
                  }
                }}
                tabIndex={0}
                role="button"
                className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <td className="px-5 py-3.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(run as FormattedRunRow)
                    }}
                    className="rounded-xs font-mono text-[12.5px] font-semibold text-primary transition-all hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    {run.id.slice(0, 8)}
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                    <GitBranch className="size-3.5 text-muted-foreground" />
                    {run.repository}
                  </span>
                </td>
                {showTrigger && (
                  <td className="px-5 py-3.5 text-[12.5px] text-muted-foreground">{run.trigger || 'manual'}</td>
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

      {!onSelectRun && (
        <RunDetailsSheet
          run={internalSelectedRun}
          onClose={() => setInternalSelectedRun(null)}
        />
      )}
    </>
  )
}


