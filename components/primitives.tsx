import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Status } from '@/lib/data'

export function PageHeader({
  crumb,
  title,
  description,
  action,
}: {
  crumb: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="mb-2.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <span>Workspace</span>
          <ChevronRight className="size-3.5 text-muted-foreground/60" />
          <span>{crumb}</span>
        </div>
        <h1 className="text-[26px] font-semibold leading-tight text-balance">{title}</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function PrimaryButton({
  children,
  icon: Icon,
  className,
}: {
  children: React.ReactNode
  icon?: React.ElementType
  className?: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-[13.5px] font-medium text-primary-foreground shadow-[0_8px_24px_-10px_rgba(124,92,249,0.95)] transition-colors hover:bg-[#6c4bf0]',
        className,
      )}
    >
      {Icon && <Icon className="size-[16px]" />}
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  icon: Icon,
  className,
}: {
  children: React.ReactNode
  icon?: React.ElementType
  className?: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border bg-[#0f131b] px-3 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-accent',
        className,
      )}
    >
      {children}
      {Icon && <Icon className="size-[13px] text-muted-foreground" />}
    </button>
  )
}

export function Panel({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  eyebrow?: string
  eyebrowIcon?: React.ElementType
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('panel overflow-hidden', className)}>
      {(eyebrow || title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            {eyebrow && (
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {EyebrowIcon && <EyebrowIcon className="size-3.5" />}
                {eyebrow}
              </p>
            )}
            {title && <h2 className="mt-2 text-[17px] font-semibold">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('px-5 pb-5 pt-4', bodyClassName)}>{children}</div>
    </section>
  )
}

const statusStyles: Record<Status, string> = {
  Passed: 'bg-success/12 text-success',
  Failed: 'bg-destructive/12 text-destructive',
  Analyzing: 'bg-primary/15 text-[#a58cff]',
  Queued: 'bg-secondary text-muted-foreground',
  Running: 'bg-info/12 text-info',
  Repaired: 'bg-success/10 text-success/90',
  Skipped: 'bg-secondary text-muted-foreground',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium',
        statusStyles[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

const priorityStyles = {
  HIGH: 'bg-destructive/12 text-destructive',
  MEDIUM: 'bg-warning/12 text-warning',
  LOW: 'bg-secondary text-muted-foreground',
} as const

export function PriorityBadge({ priority }: { priority: keyof typeof priorityStyles }) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold tracking-wide',
        priorityStyles[priority],
      )}
    >
      {priority}
    </span>
  )
}

export function Meter({
  value,
  tone = 'violet',
  className,
}: {
  value: number
  tone?: 'violet' | 'green' | 'amber' | 'red'
  className?: string
}) {
  const tones = {
    violet: 'bg-primary',
    green: 'bg-success',
    amber: 'bg-warning',
    red: 'bg-destructive',
  }
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
