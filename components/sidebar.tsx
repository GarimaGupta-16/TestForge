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
  LogOut,
  MoreHorizontal,
  PenLine,
  Play,
  Settings,
  Sparkles,
  BarChart3,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { failures } from '@/lib/data'
import { useAuth } from '@/context/auth-context'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user, profile } = useAuth()

  const fullName = profile?.full_name || user?.user_metadata?.full_name || 'Garima Gupta'
  const email = user?.email || 'garima@testforge.dev'
  const firstName = fullName.split(' ')[0] || 'Garima'

  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'GG'

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
          badge: failures.length > 0 ? failures.length.toString() : undefined,
        },
      ],
    },
    {
      label: 'System',
      items: [{ href: '/settings', label: 'Settings', icon: Settings }],
    },
  ]

  return (
    <div className="flex h-full w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-5 transition-opacity hover:opacity-90"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-[18px]" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-foreground">TestForge</span>
          <span className="block text-[11px] text-muted-foreground/80">Autonomous testing</span>
        </span>
      </Link>

      <div className="px-4">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-secondary"
        >
          <span className="flex size-5 items-center justify-center rounded bg-primary/20 text-[10px] font-bold text-primary">
            {firstName[0]}
          </span>
          <span className="flex-1 truncate text-[13px] font-medium text-foreground">{firstName}&apos;s workspace</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <nav className="scroll-thin mt-5 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
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
                        'relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150',
                        active
                          ? 'bg-sidebar-accent font-semibold text-foreground'
                          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                      )}
                    >
                      {active && (
                        <span className="absolute -left-4 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <item.icon
                        className={cn('size-[17px] shrink-0 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-destructive">
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

      <div className="border-t border-sidebar-border px-4 py-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inset-0 animate-ping rounded-full bg-success/70" />
            <span className="relative size-2 rounded-full bg-success" />
          </span>
          <span className="flex-1 leading-tight">
            <span className="block text-[12.5px] font-medium text-foreground">Agent online</span>
            <span className="block text-[11px] text-muted-foreground">Ollama · Qwen</span>
          </span>
          <MoreHorizontal className="size-4 text-muted-foreground" />
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <PenLine className="size-3.5 text-muted-foreground" />
          <span className="flex-1 text-[12px] text-muted-foreground">Browserbase</span>
          <span className="text-[11px] font-medium text-success">Connected</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-sidebar-border px-4 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={fullName} className="size-8 rounded-full border border-border object-cover shrink-0" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-secondary border border-border text-[11px] font-semibold text-foreground shrink-0">
              {initials}
            </span>
          )}
          <span className="leading-tight min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-medium text-foreground">{fullName}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{email}</span>
          </span>
        </div>

        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            title="Sign Out"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

