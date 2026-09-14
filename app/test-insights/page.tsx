import { BarChart3, Flame, Play, TrendingUp } from 'lucide-react'
import { Meter, PageHeader, Panel, PrimaryButton } from '@/components/primitives'
import { featureHealth, insights, passRateSeries, testCases } from '@/lib/data'

export const metadata = { title: 'Test Insights · TestPilot AI' }

const flakiest = testCases.slice(0, 5).map((c, i) => ({
  ...c,
  flakes: [7, 5, 4, 3, 2][i],
}))

export default function TestInsightsPage() {
  return (
    <>
      <PageHeader
        crumb="Test insights"
        title="Test insights"
        description="Trends, flake sources and where quality is moving."
        action={<PrimaryButton icon={Play}>Run latest tests</PrimaryButton>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {insights.map((item) => (
          <article key={item.label} className="panel p-5">
            <p className="text-[12.5px] text-muted-foreground">{item.label}</p>
            <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight">
              {item.value}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-success">
              <TrendingUp className="size-3.5" />
              {item.delta}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          eyebrow="Last 7 days"
          eyebrowIcon={BarChart3}
          title="Pass rate trend"
          className="lg:col-span-3"
        >
          <div className="flex h-56 items-end gap-3 pt-4">
            {passRateSeries.map((d) => (
              <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {d.pass}%
                </span>
                <div className="flex w-full max-w-[42px] flex-1 flex-col justify-end overflow-hidden rounded-md bg-secondary">
                  <div
                    className="w-full shrink-0 bg-destructive/50"
                    style={{ height: `${d.fail}%` }}
                    aria-hidden="true"
                  />
                  <div
                    className="w-full shrink-0 bg-success"
                    style={{ height: `${d.pass}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-5 border-t border-border pt-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-success" /> Passed
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-destructive/60" /> Failed
            </span>
          </div>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <Panel eyebrow="Instability" eyebrowIcon={Flame} title="Flakiest tests">
            <ul className="space-y-3 pt-1">
              {flakiest.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className="w-[74px] shrink-0 font-mono text-[11.5px] text-[#a58cff]">
                    {t.id}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px]">{t.test}</span>
                  <span className="shrink-0 rounded-md bg-warning/12 px-2 py-0.5 text-[11px] font-medium text-warning">
                    {t.flakes}×
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel eyebrow="Distribution" eyebrowIcon={BarChart3} title="Tests per feature">
            <ul className="space-y-3.5 pt-1">
              {featureHealth.map((f) => (
                <li key={f.feature}>
                  <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                    <span>{f.feature}</span>
                    <span className="tabular-nums text-muted-foreground">{f.total}</span>
                  </div>
                  <Meter value={(f.total / 40) * 100} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
