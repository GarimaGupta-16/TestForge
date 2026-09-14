import { Activity, Clock, Play, Terminal } from 'lucide-react'
import { PageHeader, Panel, PrimaryButton } from '@/components/primitives'
import { RunsTable } from '@/components/runs-table'
import { recentRuns } from '@/lib/data'

export const metadata = { title: 'Test Runs · TestForge' }


const summary = [
  { label: 'Runs today', value: '14', hint: '4 triggered by push' },
  { label: 'Avg duration', value: '2m 26s', hint: '11s faster than last week' },
  { label: 'Currently running', value: '1', hint: 'AUTH-004 on QuizLit' },
  { label: 'Queued', value: '2', hint: 'Finboard regression sweep' },
]

const logLines = [
  { t: '18:42:03', text: 'Browserbase session started · chromium 129' },
  { t: '18:42:04', text: 'Loaded 24 specs from QuizLit/e2e' },
  { t: '18:42:19', text: 'AUTH-001 Successful login — passed (1.4s)' },
  { t: '18:42:26', text: 'AUTH-002 Invalid password — failed (2.1s)' },
  { t: '18:42:27', text: 'Captured trace, DOM snapshot and 3 network events' },
  { t: '18:42:41', text: 'AUTH-004 Session persists on reload — timeout after 10s' },
  { t: '18:42:42', text: 'Handing failure to the analysis agent…' },
]

export default function TestRunsPage() {
  return (
    <>
      <PageHeader
        crumb="Test runs"
        title="Test runs"
        description="Live execution history across every connected application."
        action={<PrimaryButton icon={Play}>Run latest tests</PrimaryButton>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <article key={item.label} className="panel p-5 transition-all duration-150 hover:border-border-strong">
            <p className="text-[12.5px] font-medium text-muted-foreground">{item.label}</p>
            <p className="mt-3 text-3xl font-bold leading-none tracking-tight font-mono text-foreground">
              {item.value}
            </p>
            <p className="mt-3 text-[11.5px] text-muted-foreground">{item.hint}</p>
          </article>
        ))}
      </div>

      <section className="panel mb-6 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              <Activity className="size-3.5 text-primary" />
              Execution history
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-foreground">All runs</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info/10 px-2.5 py-0.5 text-[11.5px] font-medium text-info">
            <span className="size-1.5 animate-pulse rounded-full bg-info" />
            1 running
          </span>
        </div>
        <RunsTable rows={recentRuns} showTrigger />
      </section>

      <Panel eyebrow="Live output" eyebrowIcon={Terminal} title="#RUN-1024 · QuizLit">
        <ul className="scroll-thin max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border bg-[#070b12] p-4 font-mono text-[12px] leading-relaxed">
          {logLines.map((line) => (
            <li key={line.t} className="flex gap-3">
              <span className="shrink-0 text-muted-foreground/60">{line.t}</span>
              <span className="text-foreground/90">{line.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <Clock className="size-3.5 text-primary" />
          Streaming from the active Browserbase session.
        </p>
      </Panel>
    </>
  )
}

