'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, Wrench, PlayCircle } from 'lucide-react'
import { PrimaryButton } from '@/components/primitives'

interface FailureApplyRepairButtonProps {
  owner: string
  repo: string
  failureId: string
  currentStatus: string
  isVerified?: boolean
  originalLocator?: string
  proposedLocator?: string
  rerunStatus?: string | null
  testRunId?: string | null
}

export function FailureApplyRepairButton({
  owner,
  repo,
  failureId,
  currentStatus,
  isVerified = false,
  originalLocator = '.card-button',
  proposedLocator = '.quiz-card:has-text("Create Quiz") button',
  rerunStatus: initialRerunStatus = null,
  testRunId: initialTestRunId = null,
}: FailureApplyRepairButtonProps) {
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('Applying fix & verifying...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
  }, [currentStatus, proposedLocator])
  const [appliedInfo, setAppliedInfo] = useState<{
    applied: boolean
    originalValue?: string
    proposedValue?: string
    rerunStatus?: string
    testRunId?: string
  } | null>(
    currentStatus === 'applied' || isVerified
      ? {
          applied: true,
          originalValue: originalLocator,
          proposedValue: proposedLocator,
          rerunStatus: initialRerunStatus || 'passed',
          testRunId: initialTestRunId || undefined,
        }
      : null
  )

  const router = useRouter()

  const isAlreadyVerified = isVerified || currentStatus === 'applied' || appliedInfo?.applied

  const handleApplyRepair = async () => {
    if (loading || isAlreadyVerified) return
    setLoading(true)
    setError(null)
    setLoadingMsg('Verifying repair proposal...')

    try {
      const res = await fetch(
        `/api/github/repositories/${owner}/${repo}/failures/${failureId}/repair/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      )

      const data = await res.json().catch(() => null)

      if (data?.alreadyPresent) {
        setLoadingMsg('Repair already present in test definition. Verifying fix...')
      }

      if (res.status === 409 || data?.error === 'stale_repair') {
        setError(data?.message || 'Test step changed since this repair was proposed.')
        return
      }

      if (!res.ok || !data?.success) {
        const msg = data?.message || 'Verification rerun failed. Repair remains drafted.'
        setError(msg)
        return
      }

      setAppliedInfo({
        applied: true,
        originalValue: data.originalValue || originalLocator,
        proposedValue: data.proposedValue || proposedLocator,
        rerunStatus: data.rerun?.status || 'passed',
        testRunId: data.rerun?.testRunId,
      })

      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to repair service.')
    } finally {
      setLoading(false)
    }
  }

  if (isAlreadyVerified) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-success/30 bg-success/5 p-3.5 text-[12px]">
        <div className="flex items-center gap-2 font-semibold text-success">
          <CheckCircle2 className="size-4 shrink-0 text-success" />
          <span>Already Verified (Verified by Playwright)</span>
        </div>
        <div className="font-mono text-[11.5px] text-muted-foreground space-y-1 pl-6">
          <div>
            <span className="text-destructive font-medium">- Original: </span>
            <code>{appliedInfo?.originalValue || originalLocator}</code>
          </div>
          <div>
            <span className="text-success font-medium">+ Applied: </span>
            <code>{appliedInfo?.proposedValue || proposedLocator}</code>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-border/40 text-[11.5px] text-foreground font-sans">
            <PlayCircle className="size-3.5 text-primary shrink-0" />
            <span>
              Verification Rerun: <strong className="text-success font-semibold">PASSED</strong> (Verified by Playwright)
            </span>
          </div>
        </div>
      </div>
    )
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
        onClick={handleApplyRepair}
        disabled={loading || currentStatus !== 'drafted'}
        className="px-3.5 py-1.5 text-[12.5px]"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" />
            {loadingMsg}
          </span>
        ) : (
          'Apply fix'
        )}
      </PrimaryButton>
    </div>
  )
}

