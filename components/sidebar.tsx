'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  FolderGit2,
  LayoutGrid,
  ListChecks,
  MoreHorizontal,
  PenLine,
  Play,
  Settings,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const groups = [
  {
    label: 'Workspace',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutGrid },
      { href: '/repositories', label: 'Repositories', icon: FolderGit2 },
      { href: '/test-cases', label: 'Test Cases', icon: ListChecks },
      { href: '/test-runs', label: 'Test Runs', icon: Play },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/ai-agent', label: 'AI Agent', icon: Bot },
      { href: '/test-insights', label: 'Test Insights', icon: TrendingUp },
      {
        href: '/failure-analysis',
        label: 'Failure Analysis',
        icon: AlertTriangle,
        badge: '3',
      },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/settings', label: 'Settings', icon: Settings }],
  },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-5 transition-opacity hover:opacity-80"
      >
        <span className="flex size-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#8b6cff] to-[#5b3fd8] shadow-[0_6px_18px_-6px_rgba(124,92,249,0.9)]">
          <Sparkles className="size-[18px] text-white" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight">TestPilot</span>
          <span className="block text-[11px] text-muted-foreground">Autonomous testing</span>
        </span>
      </Link>

      <div className="px-4">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-[#0f131b] px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-accent"
        >
          <span className="flex size-5 items-center justify-center rounded-[6px] bg-primary/20 text-[10px] font-semibold text-primary">
            G
          </span>
          <span className="flex-1 truncate text-[13px] font-medium">Garima&apos;s workspace</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <nav className="scroll-thin mt-6 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
                        active
                          ? 'bg-sidebar-accent font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      {active && (
                        <span className="absolute -left-4 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <item.icon
                        className={cn('size-[17px] shrink-0', active && 'text-primary')}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-[12.5px] font-medium">Agent online</span>
            <span className="block text-[11px] text-muted-foreground">Ollama · Qwen</span>
          </span>
          <MoreHorizontal className="size-4 text-muted-foreground" />
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <PenLine className="size-4 text-muted-foreground" />
          <span className="flex-1 text-[12.5px] text-muted-foreground">Browserbase</span>
          <span className="text-[11.5px] font-medium text-success">Connected</span>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-3.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3a3f52] to-[#22262f] text-[11px] font-semibold">
          GG
        </span>
        <span className="leading-tight">
          <span className="block text-[12.5px] font-medium">Garima Gupta</span>
          <span className="block text-[11px] text-muted-foreground">Administrator</span>
        </span>
      </div>
    </div>
  )
}
