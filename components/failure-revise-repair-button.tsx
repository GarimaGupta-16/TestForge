'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { GhostButton } from '@/components/primitives'

interface FailureReviseRepairButtonProps {
  owner: string
  repo: string
  failureId: string
}

export function FailureReviseRepairButton({ owner, repo, failureId }: FailureReviseRepairButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleReviseRepair = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/failures/${failureId}/repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ mode: 'revision' }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        const msg = typeof data?.message === 'string' ? data.message : null
        setError(msg || 'Failed to revise AI repair proposal.')
        return
      }

      // Success: Refresh server component to render revised drafted proposal
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to repair service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {error && (
        <div className="flex items-center gap-1.5 rounded border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11.5px] text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <GhostButton
        icon={loading ? Loader2 : RefreshCw}
        onClick={handleReviseRepair}
        disabled={loading}
        className="px-3 py-1.5 text-[12.5px]"
      >
        {loading ? 'Revising Repair...' : 'Revise AI Repair'}
      </GhostButton>
    </div>
  )
}
