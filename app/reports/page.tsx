import Link from 'next/link'
import { BarChart3, Download, FileText, Play } from 'lucide-react'
import {
  GhostButton,
  Meter,
  PageHeader,
  Panel,
  PrimaryButton,
} from '@/components/primitives'
import { getUserReports } from '@/lib/db/reports'
import { getUserTestCases } from '@/lib/db/test-cases'
import { getLocalDateString } from '@/lib/utils/date'

export const metadata = { title: 'Reports · TestForge' }
export const dynamic = 'force-dynamic'

const CATEGORY_NAMES: Record<string, string> = {
  e2e: 'End-to-End',
  auth: 'Authentication',
  authentication: 'Authentication',
  navigation: 'Navigation',
  forms: 'Forms',
  quiz: 'Quiz Creation',
  'quiz creation': 'Quiz Creation',
  regression: 'Regression',
  visual: 'Visual UI',
}

function formatCategoryName(cat: string): string {
  const lower = cat.toLowerCase().trim()
  if (CATEGORY_NAMES[lower]) return CATEGORY_NAMES[lower]
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}

export default async function ReportsPage() {
  const reports = await getUserReports()
  const testCases = await getUserTestCases()

  // Calculate dynamic Category Health from real test_cases
  const categoryMap = new Map<
    string,
    { name: string; total: number; passed: number; failed: number }
  >()

  for (const tc of testCases) {
    const rawCat = tc.category || 'e2e'
    const catName = formatCategoryName(rawCat)
    const existing = categoryMap.get(catName) || {
      name: catName,
      total: 0,
      passed: 0,
      failed: 0,
    }

    existing.total += 1
    if (tc.status === 'passing') existing.passed += 1
    else if (tc.status === 'failing') existing.failed += 1

    categoryMap.set(catName, existing)
  }

  const categoryHealthList = Array.from(categoryMap.values())

  return (
    <>
      <PageHeader
        crumb="Testing reports"
        title="Testing reports"
        description="Application quality and test suit reports."
        action={
          <Link href="/test-cases">
            <PrimaryButton icon={Play}>Run latest tests</PrimaryButton>
          </Link>
        }
      />

      {reports.length === 0 ? (
        <div className="panel mb-6 flex flex-col items-center justify-center p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-secondary/80 text-muted-foreground">
            <FileText className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">No reports generated yet</h3>
          <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
            Quality reports generated during automated testing sweeps will appear here.
          </p>
        </div>
      ) : (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <article
              key={report.id}
              className="panel flex flex-col p-5 transition-all duration-150 hover:border-border-strong"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <FileText className="size-[17px]" />
                </span>
                <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-success">
                  {report.type || 'Quality Digest'}
                </span>
              </div>
              <h2 className="mt-4 text-[16px] font-bold text-foreground text-balance">{report.title}</h2>
              <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">
                {report.repository?.full_name || report.repository?.name || 'Repository'} ·{' '}
                {getLocalDateString(report.generated_at)}
              </p>

              <div className="mt-5 space-y-2.5 border-t border-border/60 pt-4 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pass rate</span>
                  <span className="font-semibold font-mono tabular-nums text-foreground">
                    {report.pass_rate_percent}%
                  </span>
                </div>
                <Meter value={report.pass_rate_percent} tone={report.pass_rate_percent >= 80 ? 'green' : 'amber'} />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Runs included</span>
                  <span className="font-mono tabular-nums text-foreground">{report.total_runs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Failures detected</span>
                  <span className="font-semibold font-mono tabular-nums text-destructive">
                    {report.total_failures}
                  </span>
                </div>
                {report.repairs_applied > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Repairs applied</span>
                    <span className="font-semibold font-mono tabular-nums text-success">
                      {report.repairs_applied}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-4">
                <GhostButton icon={Download}>Download</GhostButton>
                <GhostButton>View report</GhostButton>
              </div>
            </article>
          ))}
        </div>
      )}

      <Panel eyebrow="Category breakdown" eyebrowIcon={BarChart3} title="Health by feature">
        {categoryHealthList.length === 0 ? (
          <div className="p-6 text-center text-sm font-medium text-muted-foreground">
            No category health data available yet.
          </div>
        ) : (
          <ul className="space-y-4 pt-1">
            {categoryHealthList.map((f) => {
              const rate = f.total > 0 ? Math.round((f.passed / f.total) * 100) : 0
              return (
                <li key={f.name}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-[13px]">
                    <span className="font-medium text-foreground">{f.name}</span>
                    <span className="flex items-center gap-4 text-[12px] font-mono text-muted-foreground">
                      <span>
                        {f.passed}/{f.total} passing
                      </span>
                      {f.failed > 0 && <span className="text-destructive">{f.failed} failing</span>}
                      <span className="w-12 text-right font-bold font-mono tabular-nums text-foreground">
                        {rate}%
                      </span>
                    </span>
                  </div>
                  <Meter value={rate} tone={rate >= 90 ? 'green' : rate >= 75 ? 'amber' : 'red'} />
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </>
  )
}

