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
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2 text-[12px] font-medium tracking-wide text-muted-foreground">
          <span>Workspace</span>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <span className="text-foreground/80">{crumb}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl text-balance">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
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
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
  icon?: React.ElementType
  className?: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      <span>{children}</span>
    </button>
  )
}

export function GhostButton({
  children,
  icon: Icon,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
  icon?: React.ElementType
  className?: string
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-[12.5px] font-medium text-foreground/90 transition-all duration-150 hover:border-border-strong hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
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
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {EyebrowIcon && <EyebrowIcon className="size-3.5 text-primary" />}
                {eyebrow}
              </p>
            )}
            {title && <h2 className="mt-1 text-[16px] font-semibold text-foreground">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

const statusStyles: Record<Status, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  Passed: {
    bg: 'bg-success/10 border-success/20',
    text: 'text-success',
    dot: 'bg-success',
  },
  Failed: {
    bg: 'bg-destructive/10 border-destructive/20',
    text: 'text-destructive',
    dot: 'bg-destructive',
  },
  Analyzing: {
    bg: 'bg-primary/10 border-primary/20',
    text: 'text-primary',
    dot: 'bg-primary',
    pulse: true,
  },
  Queued: {
    bg: 'bg-secondary border-border',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground/60',
  },
  Running: {
    bg: 'bg-info/10 border-info/20',
    text: 'text-info',
    dot: 'bg-info',
    pulse: true,
  },
  Repaired: {
    bg: 'bg-success/10 border-success/20',
    text: 'text-success',
    dot: 'bg-success',
  },
  Skipped: {
    bg: 'bg-secondary border-border',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground/60',
  },
}

export function StatusBadge({ status }: { status: Status }) {
  const style = statusStyles[status] ?? statusStyles.Queued
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition-colors',
        style.bg,
        style.text,
      )}
    >
      <span className="relative flex size-1.5 shrink-0">
        {style.pulse && (
          <span className={cn('absolute inset-0 animate-ping rounded-full opacity-75', style.dot)} />
        )}
        <span className={cn('relative size-1.5 rounded-full', style.dot)} />
      </span>
      <span>{status}</span>
    </span>
  )
}

const priorityStyles = {
  HIGH: 'bg-destructive/10 border-destructive/20 text-destructive',
  MEDIUM: 'bg-warning/10 border-warning/20 text-warning',
  LOW: 'bg-secondary border-border text-muted-foreground',
} as const

export function PriorityBadge({ priority }: { priority: keyof typeof priorityStyles }) {
  return (
    <span
      className={cn(
        'inline-block rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider',
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
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary/80', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

