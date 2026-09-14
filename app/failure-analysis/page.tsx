import { AlertTriangle, GitPullRequest, Play, Sparkles, Wrench } from 'lucide-react'
import {
  GhostButton,
  Meter,
  PageHeader,
  Panel,
  PrimaryButton,
} from '@/components/primitives'
import { failures } from '@/lib/data'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Failure Analysis · TestPilot AI' }

const stateStyles = {
  'Fix proposed': 'bg-primary/12 text-[#a58cff]',
  'Auto-repaired': 'bg-success/12 text-success',
  'Needs review': 'bg-warning/12 text-warning',
} as const

export default function FailureAnalysisPage() {
  return (
    <>
      <PageHeader
        crumb="Failure analysis"
        title="Failure analysis"
        description="Understand why a test failed and what to fix next."
        action={<PrimaryButton icon={Play}>Run latest tests</PrimaryButton>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Open failures', value: '3', tone: 'text-destructive' },
          { label: 'Auto-repaired this week', value: '17', tone: 'text-success' },
          { label: 'Avg diagnosis time', value: '38s', tone: 'text-foreground' },
        ].map((item) => (
          <article key={item.label} className="panel p-5">
            <p className="text-[12.5px] text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                'mt-3 text-[30px] font-semibold leading-none tracking-tight',
                item.tone,
              )}
            >
              {item.value}
            </p>
          </article>
        ))}
      </div>

      <div className="space-y-4">
        {failures.map((f) => (
          <Panel key={f.id} eyebrow={f.repository} eyebrowIcon={AlertTriangle}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-[12.5px] text-[#a58cff]">{f.id}</span>
                  <h2 className="text-[16px] font-semibold">{f.test}</h2>
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] font-medium',
                      stateStyles[f.state],
                    )}
                  >
                    {f.state}
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-destructive/90">{f.cause}</p>
              </div>
              <div className="w-full max-w-[190px] shrink-0">
                <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-muted-foreground">
                  <span>AI confidence</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {f.confidence}%
                  </span>
                </div>
                <Meter
                  value={f.confidence}
                  tone={f.confidence >= 90 ? 'green' : f.confidence >= 75 ? 'amber' : 'red'}
                />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border bg-[#0f131b] p-4">
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#a58cff]">
                <Sparkles className="size-3.5" />
                Suggested fix
              </p>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-foreground/85 text-pretty">
                {f.suggestion}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <span className="rounded-md bg-secondary px-2 py-1 text-[11.5px] text-muted-foreground">
                {f.category}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                {f.occurrences} occurrence{f.occurrences > 1 ? 's' : ''} this week
              </span>
              <span className="ml-auto flex items-center gap-2">
                <GhostButton icon={GitPullRequest}>Open PR</GhostButton>
                <PrimaryButton icon={Wrench} className="px-3 py-2 text-[12.5px]">
                  Apply fix
                </PrimaryButton>
              </span>
            </div>
          </Panel>
        ))}
      </div>
    </>
  )
}
