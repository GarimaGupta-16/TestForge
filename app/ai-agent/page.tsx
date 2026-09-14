import { Bot, Cpu, MessagesSquare, Play, Workflow } from 'lucide-react'
import { PageHeader, Panel, PrimaryButton } from '@/components/primitives'
import { agentTimeline, agentTranscript } from '@/lib/data'
import { cn } from '@/lib/utils'

export const metadata = { title: 'AI Agent · TestForge' }


const config = [
  { label: 'Model', value: 'Qwen 2.5 Coder 32B' },
  { label: 'Runtime', value: 'Ollama · self-hosted' },
  { label: 'Browser', value: 'Browserbase · chromium 129' },
  { label: 'Autonomy', value: 'Propose fix, open PR' },
  { label: 'Max repairs / run', value: '5' },
  { label: 'Trace capture', value: 'On failure' },
]

const stateStyles = {
  done: 'border-success/30 bg-success/10 text-success',
  active: 'border-info/30 bg-info/10 text-info',
  pending: 'border-border bg-secondary/50 text-muted-foreground',
}

export default function AiAgentPage() {
  return (
    <>
      <PageHeader
        crumb="AI testing agent"
        title="AI testing agent"
        description="Autonomous testing intelligence, from understanding to repair."
        action={<PrimaryButton icon={Play}>Run latest tests</PrimaryButton>}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          eyebrow="Agent loop"
          eyebrowIcon={Workflow}
          title="What the agent is doing"
          className="lg:col-span-3"
        >
          <ol className="pt-2">
            {agentTimeline.map((step, i) => (
              <li key={step.step} className="relative flex gap-4 pb-6 last:pb-0">
                {i < agentTimeline.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border/60" />
                )}
                <span
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold font-mono',
                    stateStyles[step.status],
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14.5px] font-bold text-foreground">{step.step}</h3>
                    {step.status === 'active' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info/10 px-2.5 py-0.5 text-[10.5px] font-medium text-info">
                        <span className="size-1.5 animate-pulse rounded-full bg-info" />
                        In progress
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">
                    {step.detail}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] font-medium text-primary">
                    {step.meta}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <Panel eyebrow="Configuration" eyebrowIcon={Cpu} title="Agent setup">
            <dl className="divide-y divide-border/60 pt-1">
              {config.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-2.5 text-[12.5px]">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="truncate font-semibold font-mono text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel eyebrow="Console" eyebrowIcon={MessagesSquare} title="Agent transcript">
            <ul className="space-y-3 pt-1">
              {agentTranscript.map((msg, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex gap-2.5 rounded-lg border border-border/50 p-3 text-[12.5px] leading-relaxed',
                    msg.role === 'agent'
                      ? 'bg-secondary/40 text-foreground'
                      : 'bg-primary/10 border-primary/20 text-foreground',
                  )}
                >
                  {msg.role === 'agent' ? (
                    <Bot className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-secondary border border-border text-[9px] font-bold text-foreground">
                      GG
                    </span>
                  )}
                  <span className="text-pretty">{msg.text}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}

