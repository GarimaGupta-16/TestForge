'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, Loader2, AlertCircle } from 'lucide-react'
import { PrimaryButton } from '@/components/primitives'

interface FailureRepairButtonProps {
  owner: string
  repo: string
  failureId: string
}

export function FailureRepairButton({ owner, repo, failureId }: FailureRepairButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleProposeRepair = async () => {
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
      })

      const data = await res.json().catch(() => null)

      if (res.status === 504 || data?.error === 'timeout' || data?.message?.toLowerCase().includes('timed out')) {
        setError('AI repair proposal timed out. Please try again.')
        return
      }

      if (!res.ok || !data?.success) {
        const msg = typeof data?.message === 'string' ? data.message : null
        setError(msg || 'Failed to generate AI repair proposal.')
        return
      }

      // Success: Refresh server component to render drafted proposal
      router.refresh()
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('timeout') || err?.message?.toLowerCase().includes('abort')) {
        setError('AI repair proposal timed out. Please try again.')
      } else {
        setError('Failed to reach AI repair service. Please try again.')
      }
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
      <PrimaryButton
        icon={loading ? Loader2 : Wrench}
        onClick={handleProposeRepair}
        disabled={loading}
        className="px-3 py-1.5 text-[12.5px]"
      >
        {loading ? 'Drafting Repair Proposal...' : 'Propose AI Repair'}
      </PrimaryButton>
    </div>
  )
}
