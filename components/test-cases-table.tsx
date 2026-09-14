'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/primitives'
import { caseFilters, testCases } from '@/lib/data'
import { cn } from '@/lib/utils'

export function TestCasesTable() {
  const [filter, setFilter] = useState<string>('All')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return testCases.filter((c) => {
      const matchesFilter = filter === 'All' || c.feature === filter
      const matchesQuery =
        !q || c.test.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [filter, query])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-[13px] transition-all focus-within:border-primary/50 focus-within:bg-secondary">
          <Search className="size-[15px] text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search test cases..."
            aria-label="Search test cases"
            className="w-44 bg-transparent text-foreground outline-none placeholder:text-muted-foreground sm:w-56"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-secondary/30 p-1">
          {caseFilters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1 text-[12.5px] font-medium transition-all duration-150',
                filter === f
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <section className="panel scroll-thin overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['ID', 'Test', 'Feature', 'Priority', 'Type', 'Status', 'Last run'].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((c) => (
              <tr
                key={c.id}
                className="transition-colors hover:bg-accent/40"
              >
                <td className="px-5 py-3.5 font-mono text-[12.5px] font-semibold text-primary">{c.id}</td>
                <td className="px-5 py-3.5 text-[13px] font-medium text-foreground">{c.test}</td>
                <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{c.feature}</td>
                <td className="px-5 py-3.5">
                  <PriorityBadge priority={c.priority} />
                </td>
                <td className="px-5 py-3.5">
                  <span className="rounded border border-border/80 bg-secondary/50 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                    {c.type}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-5 py-3.5 font-mono text-[12.5px] text-muted-foreground">{c.lastRun}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                  No test cases match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  )
}

