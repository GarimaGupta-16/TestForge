import Link from 'next/link'
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Gauge,
  MoreHorizontal,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import { Panel } from '@/components/primitives'
import { cn } from '@/lib/utils'

export interface TestHealthProps {
  passed?: number
  failed?: number
  skipped?: number
  total?: number
  passRate?: number
  hint?: string
}

export interface AgentActivityItem {
  id: string
  title: string
  detail: string
  time: string
  kind: 'success' | 'error' | 'running' | 'ai'
  timestamp?: string
}

function Donut({ passRate = 0 }: { passRate?: number }) {
  const r = 58
  const c = 2 * Math.PI * r
  const safeRate = Math.min(Math.max(passRate, 0), 100)
  return (
    <div className="relative size-[168px] shrink-0">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--secondary)" strokeWidth="15" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--success)"
          strokeWidth="15"
          strokeLinecap="round"
          strokeDasharray={`${(safeRate / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-bold leading-none tracking-tight font-mono text-foreground">
          {safeRate}%
        </span>
        <span className="mt-1 text-[11.5px] font-medium text-muted-foreground">passing</span>
      </div>
    </div>
  )
}

export function TestHealth({
  passed = 0,
  failed = 0,
  skipped = 0,
  total = 0,
  passRate = 0,
  hint,
}: TestHealthProps) {
  const legend = [
    { label: 'Passed', value: passed, color: 'bg-success' },
    { label: 'Failed', value: failed, color: 'bg-destructive' },
    { label: 'Skipped', value: skipped, color: 'bg-muted-foreground/60' },
  ]

  let defaultHint = 'No test cases generated yet'
  if (total > 0) {
    if (failed > 0) {
      defaultHint = `${failed} failing ${failed === 1 ? 'test needs' : 'tests need'} attention`
    } else {
      defaultHint = `All ${passed} generated ${passed === 1 ? 'test passing' : 'tests passing'}`
    }
  }

  const displayHint = hint || defaultHint
  const isHealthy = failed === 0 && total > 0

  return (
    <Panel
      eyebrow="Quality signal"
      eyebrowIcon={Gauge}
      title="Test health"
      action={<MoreHorizontal className="size-4 text-muted-foreground/50" />}
      className="lg:col-span-2"
    >
      <div className="flex flex-wrap items-center gap-8 pt-1">
        <Donut passRate={passRate} />
        <div className="flex-1 space-y-3.5">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-[13px]">
              <span className={`size-2 rounded-full ${item.color}`} />
              <span className="w-8 font-semibold font-mono tabular-nums text-foreground">{item.value}</span>
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
          <p
            className={cn(
              'flex items-center gap-2 pt-2 text-[12.5px] font-medium',
              isHealthy ? 'text-success' : failed > 0 ? 'text-warning' : 'text-muted-foreground'
            )}
          >
            <Zap className="size-3.5" />
            {displayHint}
          </p>
        </div>
      </div>
    </Panel>
  )
}

const kinds = {
  success: { Icon: CheckCircle2, className: 'text-success' },
  error: { Icon: XCircle, className: 'text-destructive' },
  running: { Icon: Activity, className: 'text-info' },
  ai: { Icon: Sparkles, className: 'text-primary' },
}

export function AgentActivity({ items = [] }: { items?: AgentActivityItem[] }) {
  return (
    <Panel
      eyebrow="Live intelligence"
      eyebrowIcon={Activity}
      title="AI Agent Activity"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[11.5px] font-medium text-success">
          <span className="size-1.5 animate-pulse rounded-full bg-success" />
          Live
        </span>
      }
      className="lg:col-span-3"
    >
      {items.length === 0 ? (
        <div className="py-8 text-center text-[13px] font-medium text-muted-foreground">
          No agent activity recorded yet.
        </div>
      ) : (
        <ul className="space-y-4 pt-1">
          {items.map((item) => {
            const { Icon, className } = kinds[item.kind] || kinds.success
            return (
              <li key={item.id} className="flex items-start gap-3">
                <Icon className={`mt-0.5 size-[17px] shrink-0 ${className}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 text-[11.5px] font-mono text-muted-foreground">{item.time}</span>
              </li>
            )
          })}
        </ul>
      )}
      <Link
        href="/ai-agent"
        className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary transition-opacity hover:opacity-80"
      >
        Open agent console
        <ArrowUpRight className="size-3.5" />
      </Link>
    </Panel>
  )
}

