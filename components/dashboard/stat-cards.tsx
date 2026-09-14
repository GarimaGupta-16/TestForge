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
import { pipeline, stats } from '@/lib/data'

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
  violet: { wrap: 'bg-primary/12 text-[#a58cff]', bar: 'bg-primary/70' },
  green: { wrap: 'bg-success/12 text-success', bar: 'bg-success/70' },
  amber: { wrap: 'bg-warning/12 text-warning', bar: 'bg-warning/70' },
}

export function PipelineStrip() {
  return (
    <div className="panel mb-6 flex flex-wrap items-center gap-y-4 px-5 py-4">
      {pipeline.map((step, i) => {
        const Icon = icons[step.icon]
        return (
          <div key={step.label} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-[#a58cff]">
              <Icon className="size-[15px]" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-medium">{step.label}</span>
              <span className="block truncate text-[11.5px] text-muted-foreground">
                {step.value}
              </span>
            </span>
            {i < pipeline.length - 1 && (
              <ChevronRight className="ml-auto hidden size-4 shrink-0 text-muted-foreground/40 xl:block" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Sparkline({ data, className }: { data: number[]; className: string }) {
  const max = Math.max(...data)
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden="true">
      {data.map((v, i) => (
        <span
          key={i}
          className={cn('w-[4px] rounded-sm', className)}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  )
}

export function StatCards() {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = icons[stat.icon]
        const tone = tones[stat.tone]
        const Trend = stat.trend === 'up' ? TrendingUp : TrendingDown
        return (
          <article key={stat.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn('flex size-7 items-center justify-center rounded-lg', tone.wrap)}
                >
                  <Icon className="size-[14px]" />
                </span>
                <span className="text-[13px] font-medium">{stat.label}</span>
              </div>
              <MoreHorizontal className="size-4 text-muted-foreground/60" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[34px] font-semibold leading-none tracking-tight">
                  {stat.value}
                </p>
                <p className="mt-3 flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-muted-foreground">
                  <Trend
                    className={cn(
                      'size-3.5',
                      stat.trend === 'up' ? 'text-success' : 'text-warning',
                    )}
                  />
                  <span className="font-medium text-foreground/80">{stat.delta}</span>
                  <span>Last 7 days</span>
                </p>
              </div>
              <Sparkline data={stat.spark} className={tone.bar} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
