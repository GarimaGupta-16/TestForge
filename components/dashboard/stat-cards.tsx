import {
  AlertTriangle,
  ChevronRight,
  FolderGit2,
  ListChecks,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  Code2,
  PenLine,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const icons = {
  repo: FolderGit2,
  checklist: ListChecks,
  shield: ShieldCheck,
  alert: AlertTriangle,
  sparkles: Sparkles,
  code: Code2,
  pen: PenLine,
}

const tones = {
  violet: { wrap: 'bg-primary/10 text-primary border border-primary/20', bar: 'bg-primary' },
  green: { wrap: 'bg-success/10 text-success border border-success/20', bar: 'bg-success' },
  amber: { wrap: 'bg-warning/10 text-warning border border-warning/20', bar: 'bg-warning' },
}

export interface PipelineStepItem {
  label: string
  value: string
  icon: keyof typeof icons
}

export interface StatCardItem {
  label: string
  value: string | number
  delta: string
  trend: 'up' | 'down'
  icon: keyof typeof icons
  tone: 'violet' | 'green' | 'amber'
  spark?: number[]
}

const defaultPipelineSteps: PipelineStepItem[] = [
  { label: 'Repository', value: 'Not connected', icon: 'repo' },
  { label: 'Intelligence', value: 'Not mapped', icon: 'sparkles' },
  { label: 'Test plan', value: 'Not ready', icon: 'checklist' },
  { label: 'Playwright', value: '0 generated', icon: 'code' },
  { label: 'Browser', value: 'Idle', icon: 'pen' },
  { label: 'Analysis', value: 'No issues', icon: 'shield' },
]

export function PipelineStrip({ steps = defaultPipelineSteps }: { steps?: PipelineStepItem[] }) {
  return (
    <div className="panel mb-6 flex flex-wrap items-center gap-y-4 px-5 py-4">
      {steps.map((step, i) => {
        const Icon = icons[step.icon] || FolderGit2
        return (
          <div key={step.label} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Icon className="size-[15px]" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-foreground">{step.label}</span>
              <span className="block truncate text-[11.5px] text-muted-foreground">
                {step.value}
              </span>
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="ml-auto hidden size-4 shrink-0 text-muted-foreground/30 xl:block" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Sparkline({ data, className }: { data: number[]; className: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden="true">
      {data.map((v, i) => (
        <span
          key={i}
          className={cn('w-[4px] rounded-sm opacity-90 transition-all hover:opacity-100', className)}
          style={{ height: `${Math.max((v / max) * 100, 10)}%` }}
        />
      ))}
    </div>
  )
}

export function StatCards({ items = [] }: { items?: StatCardItem[] }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((stat) => {
        const Icon = icons[stat.icon] || FolderGit2
        const tone = tones[stat.tone] || tones.violet
        const Trend = stat.trend === 'up' ? TrendingUp : TrendingDown
        return (
          <article key={stat.label} className="panel p-5 transition-all duration-150 hover:border-border-strong">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn('flex size-7 items-center justify-center rounded-lg', tone.wrap)}
                >
                  <Icon className="size-[14px]" />
                </span>
                <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <MoreHorizontal className="size-4 text-muted-foreground/50" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold leading-none tracking-tight text-foreground font-mono">
                  {stat.value}
                </p>
                <p className="mt-3 flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-muted-foreground">
                  <Trend
                    className={cn(
                      'size-3.5',
                      stat.trend === 'up' ? 'text-success' : 'text-warning',
                    )}
                  />
                  <span className="font-semibold text-foreground/90">{stat.delta}</span>
                </p>
              </div>
              {stat.spark && stat.spark.length > 0 && (
                <Sparkline data={stat.spark} className={tone.bar} />
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

