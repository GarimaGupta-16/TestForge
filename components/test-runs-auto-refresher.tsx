'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TestRunsAutoRefresherProps {
  hasRunning: boolean
}

/**
 * Bounded client-side auto-refresher for the Test Runs page.
 *
 * Behavior Rules:
 * 1. Only activates when hasRunning === true (at least one test_run has status === 'running').
 * 2. Refreshes page data via Next.js router.refresh() every 2000ms.
 * 3. Bounded to a maximum window of 30 attempts (60 seconds max).
 * 4. Automatically deactivates as soon as hasRunning becomes false.
 */
export function TestRunsAutoRefresher({ hasRunning }: TestRunsAutoRefresherProps) {
  const router = useRouter()

  useEffect(() => {
    if (!hasRunning) return

    let attempts = 0
    const maxAttempts = 30
    const intervalMs = 2000

    const timer = setInterval(() => {
      attempts++
      router.refresh()

      if (attempts >= maxAttempts) {
        clearInterval(timer)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [hasRunning, router])

  return null
}
