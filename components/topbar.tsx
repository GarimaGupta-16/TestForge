'use client'

import { usePathname } from 'next/navigation'
import { Bell, ChevronRight, GitPullRequest, Menu, Search } from 'lucide-react'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/repositories': 'Repositories',
  '/test-cases': 'Test Cases',
  '/test-runs': 'Test Runs',
  '/reports': 'Reports',
  '/ai-agent': 'AI Agent',
  '/test-insights': 'Test Insights',
  '/failure-analysis': 'Failure Analysis',
  '/settings': 'Settings',
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const title = titles[pathname] ?? 'Dashboard'

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-[18px]" />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
        <span className="hidden truncate text-muted-foreground sm:inline">TestPilot AI</span>
        <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:inline" />
        <span className="truncate font-medium">{title}</span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-[#0f131b] px-3 py-1.5 text-[13px] text-muted-foreground transition-colors focus-within:border-primary/50 sm:flex">
          <Search className="size-[15px]" />
          <input
            placeholder="Search"
            aria-label="Search"
            className="w-24 bg-transparent text-foreground outline-none placeholder:text-muted-foreground md:w-36"
          />
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <button
          type="button"
          aria-label="Pull requests"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <GitPullRequest className="size-[18px]" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-success" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
        </button>
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3a3f52] to-[#22262f] text-[11px] font-semibold">
          GG
        </span>
      </div>
    </header>
  )
}
