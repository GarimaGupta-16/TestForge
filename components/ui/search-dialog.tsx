'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  FolderGit2,
  LayoutGrid,
  ListChecks,
  Play,
  Search,
} from 'lucide-react'
import { repositories, testCases } from '@/lib/data'

interface SearchDialogProps {
  open: boolean
  onClose: () => void
}

const navLinks = [
  { href: '/', title: 'Dashboard', category: 'Navigation', icon: LayoutGrid },
  { href: '/repositories', title: 'Repositories', category: 'Navigation', icon: FolderGit2 },
  { href: '/test-cases', title: 'Test Cases', category: 'Navigation', icon: ListChecks },
  { href: '/test-runs', title: 'Test Runs', category: 'Navigation', icon: Play },
  { href: '/ai-agent', title: 'AI Agent Console', category: 'Intelligence', icon: Bot },
  { href: '/failure-analysis', title: 'Failure Analysis', category: 'Intelligence', icon: AlertTriangle },
]

export function useShortcutKey() {
  const [shortcut, setShortcut] = useState('Ctrl K')

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      /Mac|iPod|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '')
    ) {
      setShortcut('⌘K')
    }
  }, [])

  return shortcut
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (open) onClose()
      }
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const q = query.trim().toLowerCase()

  const matchedNav = navLinks.filter(
    (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
  )

  const matchedRepos = repositories.filter(
    (repo) => repo.name.toLowerCase().includes(q) || repo.slug.toLowerCase().includes(q),
  )

  const matchedTests = testCases.filter(
    (tc) => tc.id.toLowerCase().includes(q) || tc.test.toLowerCase().includes(q) || tc.feature.toLowerCase().includes(q),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, test ID, or search..."
            autoFocus
            className="ml-3 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mr-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
          <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="scroll-thin max-h-80 overflow-y-auto p-2">
          {matchedNav.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Pages
              </div>
              {matchedNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/90 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="size-4 text-primary" />
                    <span>{item.title}</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}

          {matchedRepos.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Repositories
              </div>
              {matchedRepos.map((repo) => (
                <a
                  key={repo.name}
                  href="/repositories"
                  onClick={onClose}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/90 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderGit2 className="size-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{repo.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{repo.slug}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{repo.passRate}% pass</span>
                </a>
              ))}
            </div>
          )}

          {matchedTests.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Test Cases
              </div>
              {matchedTests.slice(0, 5).map((tc) => (
                <a
                  key={tc.id}
                  href="/test-cases"
                  onClick={onClose}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground/90 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-primary">{tc.id}</span>
                    <span className="truncate max-w-[260px] text-xs">{tc.test}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{tc.feature}</span>
                </a>
              ))}
            </div>
          )}

          {matchedNav.length === 0 && matchedRepos.length === 0 && matchedTests.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

