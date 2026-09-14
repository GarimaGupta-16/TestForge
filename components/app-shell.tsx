'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative h-full w-[248px]">
            <Sidebar onNavigate={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute right-2 top-4 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
