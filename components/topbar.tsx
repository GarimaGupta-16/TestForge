'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, ChevronRight, GitPullRequest, Menu, Search } from 'lucide-react'
import { SearchDialog, useShortcutKey } from '@/components/ui/search-dialog'
import { failures } from '@/lib/data'

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
  const [searchOpen, setSearchOpen] = useState(false)
  const shortcutKey = useShortcutKey()

  // Use real failure count for notification indicator
  const hasFailures = failures.length > 0

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-sidebar-border bg-background/85 px-4 backdrop-blur-xl lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-[18px]" />
        </button>

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className="hidden truncate text-muted-foreground/80 sm:inline">TestForge</span>
          <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/40 sm:inline" />
          <span className="truncate font-semibold text-foreground">{title}</span>
        </nav>


        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-[13px] text-muted-foreground transition-all hover:border-border-strong hover:bg-secondary hover:text-foreground sm:flex"
          >
            <Search className="size-[15px]" />
            <span className="w-24 text-left md:w-36">Quick search...</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {shortcutKey}
            </kbd>
          </button>

          <a
            href="/failure-analysis"
            aria-label="Pull requests and fixes"
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Failure analysis & PR fixes"
          >
            <GitPullRequest className="size-[18px]" />
            {hasFailures && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
            )}
          </a>
          <a
            href="/failure-analysis"
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={`${failures.length} active failures requiring review`}
          >
            <Bell className="size-[18px]" />
            {hasFailures && (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
            )}
          </a>
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary border border-border text-[11px] font-semibold text-foreground">
            GG
          </span>
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}


