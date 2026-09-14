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
import { agentActivity } from '@/lib/data'

const PASSING = 85.2

function Donut() {
  const r = 58
  const c = 2 * Math.PI * r
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
          strokeDasharray={`${(PASSING / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-semibold leading-none tracking-tight">{PASSING}%</span>
        <span className="mt-1 text-[11.5px] text-muted-foreground">passing</span>
      </div>
    </div>
  )
}

export function TestHealth() {
  const legend = [
    { label: 'Passed', value: 109, color: 'bg-success' },
    { label: 'Failed', value: 19, color: 'bg-destructive' },
    { label: 'Skipped', value: 7, color: 'bg-muted-foreground/60' },
  ]
  return (
    <Panel
      eyebrow="Quality signal"
      eyebrowIcon={Gauge}
      title="Test health"
      action={<MoreHorizontal className="size-4 text-muted-foreground/60" />}
      className="lg:col-span-2"
    >
      <div className="flex flex-wrap items-center gap-8 pt-3">
        <Donut />
        <div className="flex-1 space-y-3.5">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-[13px]">
              <span className={`size-2 rounded-full ${item.color}`} />
              <span className="w-8 font-semibold tabular-nums">{item.value}</span>
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
          <p className="flex items-center gap-2 pt-2 text-[12.5px] text-success">
            <Zap className="size-3.5" />
            8.4% healthier than last week
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
  ai: { Icon: Sparkles, className: 'text-[#a58cff]' },
}

export function AgentActivity() {
  return (
    <Panel
      eyebrow="Live intelligence"
      eyebrowIcon={Activity}
      title="AI Agent Activity"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-md bg-success/12 px-2 py-1 text-[11.5px] font-medium text-success">
          <span className="size-1.5 animate-pulse rounded-full bg-success" />
          Live
        </span>
      }
      className="lg:col-span-3"
    >
      <ul className="space-y-4 pt-2">
        {agentActivity.map((item) => {
          const { Icon, className } = kinds[item.kind]
          return (
            <li key={item.title} className="flex items-start gap-3">
              <Icon className={`mt-0.5 size-[17px] shrink-0 ${className}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium">{item.title}</p>
                <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.detail}</p>
              </div>
              <span className="shrink-0 text-[11.5px] text-muted-foreground">{item.time}</span>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#a58cff] transition-opacity hover:opacity-80"
      >
        Open agent console
        <ArrowUpRight className="size-3.5" />
      </button>
    </Panel>
  )
}
