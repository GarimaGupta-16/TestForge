import { BarChart3, Download, FileText, Play } from 'lucide-react'
import {
  GhostButton,
  Meter,
  PageHeader,
  Panel,
  PrimaryButton,
} from '@/components/primitives'
import { featureHealth, reports } from '@/lib/data'

export const metadata = { title: 'Reports · TestForge' }


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
          <article key={report.title} className="panel flex flex-col p-5 transition-all duration-150 hover:border-border-strong">
            <div className="flex items-start justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <FileText className="size-[17px]" />
              </span>
              <span
                className={
                  report.status === 'Ready'
                    ? 'rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-success'
                    : 'rounded-full border border-warning/20 bg-warning/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-warning'
                }
              >
                {report.status}
              </span>
            </div>
            <h2 className="mt-4 text-[16px] font-bold text-foreground text-balance">{report.title}</h2>
            <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">{report.period}</p>

            <div className="mt-5 space-y-2.5 border-t border-border/60 pt-4 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Coverage</span>
                <span className="font-semibold font-mono tabular-nums text-foreground">{report.coverage}%</span>
              </div>
              <Meter value={report.coverage} tone={report.coverage >= 80 ? 'green' : 'amber'} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground">Runs included</span>
                <span className="font-mono tabular-nums text-foreground">{report.runs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Regressions</span>
                <span className="font-semibold font-mono tabular-nums text-destructive">
                  {report.regressions}
                </span>
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-4">
              <GhostButton icon={Download}>Download</GhostButton>
              <GhostButton>View report</GhostButton>
            </div>
          </article>
        ))}
      </div>

      <Panel eyebrow="Coverage breakdown" eyebrowIcon={BarChart3} title="Health by feature">
        <ul className="space-y-4 pt-1">
          {featureHealth.map((f) => {
            const rate = Math.round((f.passed / f.total) * 100)
            return (
              <li key={f.feature}>
                <div className="mb-2 flex items-center justify-between gap-4 text-[13px]">
                  <span className="font-medium text-foreground">{f.feature}</span>
                  <span className="flex items-center gap-4 text-[12px] font-mono text-muted-foreground">
                    <span>
                      {f.passed}/{f.total} passing
                    </span>
                    <span className="text-warning">{f.flaky} flaky</span>
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
      </Panel>
    </>
  )
}

