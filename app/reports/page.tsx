import { BarChart3, Download, FileText, Play } from 'lucide-react'
import {
  GhostButton,
  Meter,
  PageHeader,
  Panel,
  PrimaryButton,
} from '@/components/primitives'
import { featureHealth, reports } from '@/lib/data'

export const metadata = { title: 'Reports · TestPilot AI' }

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        crumb="Testing reports"
        title="Testing reports"
        description="Application quality and regression insights."
        action={<PrimaryButton icon={Play}>Run latest tests</PrimaryButton>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <article key={report.title} className="panel flex flex-col p-5">
            <div className="flex items-start justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-[#a58cff]">
                <FileText className="size-[17px]" />
              </span>
              <span
                className={
                  report.status === 'Ready'
                    ? 'rounded-md bg-success/12 px-2 py-1 text-[11.5px] font-medium text-success'
                    : 'rounded-md bg-warning/12 px-2 py-1 text-[11.5px] font-medium text-warning'
                }
              >
                {report.status}
              </span>
            </div>
            <h2 className="mt-4 text-[16px] font-semibold text-balance">{report.title}</h2>
            <p className="mt-1.5 font-mono text-[11.5px] text-muted-foreground">{report.period}</p>

            <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Coverage</span>
                <span className="font-semibold tabular-nums">{report.coverage}%</span>
              </div>
              <Meter value={report.coverage} tone={report.coverage >= 80 ? 'green' : 'amber'} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Runs included</span>
                <span className="tabular-nums">{report.runs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Regressions</span>
                <span className="font-medium tabular-nums text-destructive">
                  {report.regressions}
                </span>
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
              <GhostButton icon={Download}>Download</GhostButton>
              <GhostButton>View report</GhostButton>
            </div>
          </article>
        ))}
      </div>

      <Panel eyebrow="Coverage breakdown" eyebrowIcon={BarChart3} title="Health by feature">
        <ul className="space-y-4 pt-2">
          {featureHealth.map((f) => {
            const rate = Math.round((f.passed / f.total) * 100)
            return (
              <li key={f.feature}>
                <div className="mb-2 flex items-center justify-between gap-4 text-[13px]">
                  <span className="font-medium">{f.feature}</span>
                  <span className="flex items-center gap-4 text-[12px] text-muted-foreground">
                    <span>
                      {f.passed}/{f.total} passing
                    </span>
                    <span className="text-warning">{f.flaky} flaky</span>
                    <span className="w-9 text-right font-semibold tabular-nums text-foreground">
                      {rate}%
                    </span>
                  </span>
                </div>
                <Meter value={rate} tone={rate >= 90 ? 'green' : rate >= 75 ? 'amber' : 'red'} />
              </li>
            )
          })}
        </ul>
      </Panel>
    </>
  )
}
