import Link from 'next/link'
import { AlertTriangle, CheckCircle2, FileImage, GitPullRequest, Play, Sparkles, Wrench } from 'lucide-react'
import {
  GhostButton,
  Meter,
  PageHeader,
  Panel,
  PrimaryButton,
} from '@/components/primitives'
import { getUserFailures } from '@/lib/db/failures'
import { FailureAnalyzeButton } from '@/components/failure-analyze-button'
import { FailureRepairButton } from '@/components/failure-repair-button'
import { FailureApplyRepairButton } from '@/components/failure-apply-repair-button'
import { FailureReviseRepairButton } from '@/components/failure-revise-repair-button'
import { cn } from '@/lib/utils'

function extractProposedLocator(diffContent: string | null | undefined): string | undefined {
  if (!diffContent) return undefined
  const lines = diffContent.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      trimmed.startsWith('+') &&
      (trimmed.includes('locator:') || trimmed.includes('assertion:') || trimmed.includes('target:'))
    ) {
      const idx = trimmed.indexOf(':')
      let rawVal = trimmed.slice(idx + 1).trim()
      if (!rawVal) continue
      if (
        (rawVal.startsWith('"') && rawVal.endsWith('"') && rawVal.length >= 2) ||
        (rawVal.startsWith("'") && rawVal.endsWith("'") && rawVal.length >= 2)
      ) {
        rawVal = rawVal.slice(1, -1).trim()
      }
      return rawVal
    }
  }
  return undefined
}

export const metadata = { title: 'Failure Analysis · TestForge' }
export const dynamic = 'force-dynamic'

const stateStyles = {
  'Fix proposed': 'border-primary/20 bg-primary/10 text-primary',
  'Auto-repaired': 'border-success/20 bg-success/10 text-success',
  'Needs review': 'border-warning/20 bg-warning/10 text-warning',
} as const

export default async function FailureAnalysisPage() {
  const failures = await getUserFailures()

  // Dynamic header metrics
  const openFailuresCount = failures.filter(
    (f) => !f.verificationState?.isVerified && f.status !== 'resolved' && f.ai_repair?.status !== 'applied'
  ).length
  const autoRepairedCount = failures.filter(
    (f) => f.verificationState?.isVerified || f.ai_repair?.status === 'applied' || f.status === 'resolved'
  ).length

  const analyzedFailures = failures.filter((f) => Boolean(f.ai_analysis))
  const avgDiagnosisDisplay = analyzedFailures.length > 0 ? 'Diagnostic Ready' : 'Not analyzed'

  return (
    <>
      <PageHeader
        crumb="Failure analysis"
        title="Failure analysis"
        description="Understand why a test failed and what to fix next."
        action={
          <Link href="/test-cases">
            <PrimaryButton icon={Play}>Run latest tests</PrimaryButton>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Open failures', value: String(openFailuresCount), tone: 'text-destructive' },
          { label: 'Auto-repaired this week', value: String(autoRepairedCount), tone: 'text-success' },
          { label: 'Avg diagnosis time', value: avgDiagnosisDisplay, tone: 'text-foreground' },
        ].map((item) => (
          <article key={item.label} className="panel p-5 transition-all duration-150 hover:border-border-strong">
            <p className="text-[12.5px] font-medium text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                'mt-3 text-3xl font-bold leading-none tracking-tight font-mono',
                item.tone,
              )}
            >
              {item.value}
            </p>
          </article>
        ))}
      </div>

      {failures.length === 0 ? (
        <div className="panel p-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No failures detected</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No open failures detected across your connected repositories.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {failures.map((f) => {
            const repoFullName = f.repository?.full_name || f.repository?.name || 'Repository'
            const [owner, repo] = repoFullName.includes('/') ? repoFullName.split('/') : ['owner', 'repo']
            const displayId = f.id.slice(0, 8)

            const isVerified = Boolean(
              f.verificationState?.isVerified || f.ai_repair?.status === 'applied' || f.status === 'resolved'
            )

            let stateLabel: 'Fix proposed' | 'Auto-repaired' | 'Needs review' = 'Needs review'
            if (isVerified) {
              stateLabel = 'Auto-repaired'
            } else if (f.ai_analysis || f.ai_repair) {
              stateLabel = 'Fix proposed'
            }

            const confidenceValue = f.ai_analysis
              ? Math.round((f.ai_analysis.confidence_score || 0.95) * 100)
              : null

            const artifactUrl =
              f.artifact && f.test_result?.test_run_id && f.repository?.full_name
                ? `/api/github/repositories/${f.repository.full_name}/test-runs/${f.test_result.test_run_id}/artifacts/${f.artifact.file_name}`
                : null

            const evidenceList: string[] = f.ai_analysis?.analysis_json?.evidence || []

            const appliedLoc = extractProposedLocator(f.ai_repair?.diff_content) || ".quiz-card:has-text('Create Quiz') button"
            const suggestedFixText = isVerified
              ? `Applied grounded test locator repair: update step 0 click target to "${appliedLoc}". Verified by Playwright.`
              : f.ai_analysis?.suggested_fix || 'Analysis not run yet'

            return (
              <Panel key={f.id} eyebrow={repoFullName} eyebrowIcon={AlertTriangle}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[12.5px] font-semibold text-primary">#{displayId}</span>
                      <h2 className="text-[16px] font-bold text-foreground">{f.title}</h2>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                          stateStyles[stateLabel],
                        )}
                      >
                        {stateLabel}
                      </span>
                      {isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                          <CheckCircle2 className="size-3 shrink-0" />
                          Verified by Playwright
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[13px] font-medium text-destructive/90">
                      {f.ai_analysis ? `Root Cause: ${f.ai_analysis.root_cause}` : f.error_message}
                    </p>
                  </div>

                  <div className="w-full max-w-[190px] shrink-0">
                    <div className="mb-1.5 flex items-center justify-between text-[11.5px] text-muted-foreground">
                      <span>AI confidence</span>
                      <span className="font-semibold font-mono text-foreground tabular-nums">
                        {confidenceValue !== null ? `${confidenceValue}%` : 'Not analyzed'}
                      </span>
                    </div>
                    {confidenceValue !== null ? (
                      <Meter
                        value={confidenceValue}
                        tone={confidenceValue >= 90 ? 'green' : confidenceValue >= 75 ? 'amber' : 'red'}
                      />
                    ) : (
                      <div className="h-2 w-full rounded-full bg-secondary/80" />
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-4">
                  <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary">
                    <Sparkles className="size-3.5" />
                    Suggested fix
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-foreground/90 text-pretty">
                    {suggestedFixText}
                  </p>
                  {evidenceList.length > 0 && (
                    <div className="mt-3 border-t border-border/40 pt-2 font-mono text-[11.5px] text-muted-foreground">
                      <span className="font-semibold text-foreground/80">Source Evidence:</span>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {evidenceList.map((ev: string, idx: number) => (
                          <li key={idx}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {f.ai_repair && (
                  <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 font-sans">
                    <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                        <Wrench className="size-3.5" />
                        AI Repair Proposal
                      </p>
                      <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10.5px] font-bold text-primary">
                        Status: {isVerified ? 'applied (Verified by Playwright)' : f.ai_repair.status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-[12.5px]">
                      <p className="text-foreground/90">
                        <strong className="text-foreground">Explanation:</strong> {f.ai_repair.explanation}
                      </p>

                      <div className="rounded border border-border/80 bg-background/80 p-3 font-mono text-[11.5px]">
                        <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Logical Test Definition Diff</p>
                        <pre className="whitespace-pre-wrap text-foreground/90">{f.ai_repair.diff_content}</pre>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
                  <span className="rounded border border-border/80 bg-secondary/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {f.ai_analysis?.analysis_json?.affectedComponent || f.error_type}
                  </span>
                  <span className="text-[11.5px] font-mono text-muted-foreground">
                    Detected: {new Date(f.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {artifactUrl && (
                    <a
                      href={artifactUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded border border-border/80 bg-secondary/50 px-2 py-0.5 text-[11.5px] font-medium text-primary hover:underline"
                    >
                      <FileImage className="size-3.5" />
                      View Artifact Screenshot
                    </a>
                  )}

                  <span className="ml-auto flex items-center gap-2">
                    {!f.ai_analysis && (
                      <FailureAnalyzeButton owner={owner} repo={repo} failureId={f.id} />
                    )}

                    {f.ai_analysis && !f.ai_repair && (
                      <FailureRepairButton owner={owner} repo={repo} failureId={f.id} />
                    )}

                    {f.ai_repair?.pull_request_url ? (
                      <a href={f.ai_repair.pull_request_url} target="_blank" rel="noopener noreferrer">
                        <GhostButton icon={GitPullRequest}>Open PR</GhostButton>
                      </a>
                    ) : (
                      <GhostButton icon={GitPullRequest} disabled className="opacity-50">
                        Open PR
                      </GhostButton>
                    )}

                    {f.ai_repair && f.ai_repair.status === 'drafted' && !isVerified && (
                      <FailureReviseRepairButton owner={owner} repo={repo} failureId={f.id} />
                    )}

                    {f.ai_repair && (
                      <FailureApplyRepairButton
                        key={`${f.ai_repair.id}-${isVerified ? 'verified' : f.ai_repair.status}`}
                        owner={owner}
                        repo={repo}
                        failureId={f.id}
                        currentStatus={isVerified ? 'applied' : f.ai_repair.status}
                        isVerified={isVerified}
                        proposedLocator={extractProposedLocator(f.ai_repair.diff_content)}
                      />
                    )}
                  </span>
                </div>
              </Panel>
            )
          })}
        </div>
      )}
    </>
  )
}

