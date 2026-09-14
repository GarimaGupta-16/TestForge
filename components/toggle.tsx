'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function Toggle({
  label,
  detail,
  defaultOn,
}: {
  label: string
  detail: string
  defaultOn?: boolean
}) {
  const [on, setOn] = useState(Boolean(defaultOn))

  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-pretty text-[12px] leading-relaxed text-muted-foreground">
          {detail}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          on ? 'bg-primary' : 'bg-secondary border border-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-foreground shadow-sm transition-transform',
            on ? 'translate-x-[18px] bg-primary-foreground' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

