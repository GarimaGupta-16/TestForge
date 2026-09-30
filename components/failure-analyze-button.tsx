'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { PrimaryButton } from '@/components/primitives'

interface FailureAnalyzeButtonProps {
  owner: string
  repo: string
  failureId: string
}

export function FailureAnalyzeButton({ owner, repo, failureId }: FailureAnalyzeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAnalyze = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/failures/${failureId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })

      const data = await res.json().catch(() => null)

      if (res.status === 504 || data?.error === 'timeout' || data?.message?.toLowerCase().includes('timed out')) {
        setError('AI analysis timed out. Please try again.')
        return
      }

      if (!res.ok || !data?.success) {
        const msg = typeof data?.message === 'string' ? data.message : null
        setError(msg || 'Failed to generate failure analysis.')
        return
      }

      // Success: Refresh server components to render real analysis
      router.refresh()
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('timeout') || err?.message?.toLowerCase().includes('abort')) {
        setError('AI analysis timed out. Please try again.')
      } else {
        setError('Failed to reach AI analysis service. Please try again.')
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
        icon={loading ? Loader2 : Sparkles}
        onClick={handleAnalyze}
        disabled={loading}
        className="px-3 py-1.5 text-[12.5px]"
      >
        {loading ? 'Analyzing Source & Stack...' : 'Analyze Failure with AI'}
      </PrimaryButton>
    </div>
  )
}
