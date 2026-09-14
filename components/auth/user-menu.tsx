'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, User as UserIcon, Shield, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/auth-context'

export function UserMenu() {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fullName = profile?.full_name || user?.user_metadata?.full_name || 'Garima Gupta'
  const email = user?.email || 'garima@testforge.dev'

  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'GG'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-accent/60"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={fullName}
            className="size-8 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-[11px] font-semibold text-foreground">
            {initials}
          </span>
        )}
        <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl z-50 animate-in fade-in-50 zoom-in-95">
          <div className="border-b border-border/60 px-3 py-2.5">
            <p className="text-[13px] font-semibold text-foreground truncate">{fullName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{email}</p>
          </div>

          <div className="py-1">
            <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-muted-foreground">
              <Shield className="size-3.5 text-primary" />
              <span>Workspace Admin</span>
            </div>
          </div>

          <div className="border-t border-border/60 pt-1">
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-3.5" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
