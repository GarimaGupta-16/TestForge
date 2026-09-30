'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'

export interface RepositoryOption {
  id: string
  name: string
  full_name: string
}

export function RepositoryFilter({
  repositories,
  selectedRepoId,
}: {
  repositories: RepositoryOption[]
  selectedRepoId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('repo', value)
    } else {
      params.delete('repo')
    }
    const queryString = params.toString()
    router.push(queryString ? `/test-runs?${queryString}` : '/test-runs')
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="size-3.5 shrink-0 text-muted-foreground/80" />
      <span className="text-[12px] font-medium text-muted-foreground/80">Repository:</span>
      <select
        value={selectedRepoId || ''}
        onChange={handleChange}
        aria-label="Filter by repository"
        className="h-8.5 cursor-pointer rounded-md border border-border bg-secondary/60 px-2.5 py-1 text-[12.5px] font-medium text-foreground transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        <option value="">All repositories ({repositories.length})</option>
        {repositories.map((repo) => (
          <option key={repo.id} value={repo.id}>
            {repo.full_name || repo.name}
          </option>
        ))}
      </select>
    </div>
  )
}
