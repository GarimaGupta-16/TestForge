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
        <p className="text-[13px] font-medium">{label}</p>
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
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors',
          on ? 'bg-primary' : 'bg-secondary',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4 rounded-full bg-white transition-transform',
            on ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
