import { Bot, KeyRound, PenLine, Play, Users } from 'lucide-react'
import { GithubMark } from '@/components/github-mark'
import { PageHeader, Panel, PrimaryButton } from '@/components/primitives'
import { Toggle } from '@/components/toggle'

export const metadata = { title: 'Settings · TestPilot AI' }

const integrations = [
  {
    name: 'GitHub',
    detail: 'GarimaGupta-16 · 3 repositories',
    icon: GithubMark,
    status: 'Connected',
  },
  {
    name: 'Browserbase',
    detail: 'chromium 129 · us-east-1',
    icon: PenLine,
    status: 'Connected',
  },
  {
    name: 'Ollama',
    detail: 'Qwen 2.5 Coder 32B · self-hosted',
    icon: Bot,
    status: 'Connected',
  },
]

const members = [
  { name: 'Garima Gupta', email: 'garima@testpilot.ai', role: 'Administrator' },
  { name: 'Arjun Mehta', email: 'arjun@testpilot.ai', role: 'Maintainer' },
  { name: 'Lena Fischer', email: 'lena@testpilot.ai', role: 'Viewer' },
]

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        crumb="Settings"
        title="Settings"
        description="Workspace controls for your testing environment."
        action={<PrimaryButton icon={Play}>Run latest tests</PrimaryButton>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Workspace" eyebrowIcon={Users} title="General">
          <div className="space-y-4 pt-1">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] text-muted-foreground">
                Workspace name
              </span>
              <input
                defaultValue="Garima's workspace"
                className="w-full rounded-lg border border-border bg-[#0f131b] px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-primary/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] text-muted-foreground">
                Default branch
              </span>
              <input
                defaultValue="main"
                className="w-full rounded-lg border border-border bg-[#0f131b] px-3 py-2.5 font-mono text-[13px] outline-none transition-colors focus:border-primary/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] text-muted-foreground">Timezone</span>
              <select className="w-full rounded-lg border border-border bg-[#0f131b] px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-primary/50">
                <option>Asia/Kolkata (GMT+5:30)</option>
                <option>Europe/Berlin (GMT+2)</option>
                <option>America/New_York (GMT-4)</option>
              </select>
            </label>
          </div>
        </Panel>

        <Panel eyebrow="Automation" eyebrowIcon={Bot} title="Agent behaviour">
          <div className="divide-y divide-border pt-1">
            <Toggle
              label="Run on every push"
              detail="Trigger the generated suite whenever the default branch changes."
              defaultOn
            />
            <Toggle
              label="Auto-repair failing tests"
              detail="Let the agent rewrite brittle locators and assertions on its own."
              defaultOn
            />
            <Toggle
              label="Open a pull request with fixes"
              detail="Fixes arrive as a reviewable PR instead of a direct commit."
              defaultOn
            />
            <Toggle
              label="Capture full traces"
              detail="Record video and network traces for every run, not just failures."
            />
          </div>
        </Panel>

        <Panel eyebrow="Connections" eyebrowIcon={KeyRound} title="Integrations">
          <ul className="divide-y divide-border pt-1">
            {integrations.map((item) => (
              <li key={item.name} className="flex items-center gap-3 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <item.icon className="size-[16px] text-foreground/80" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">{item.name}</span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-success/12 px-2 py-1 text-[11.5px] font-medium text-success">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel eyebrow="Access" eyebrowIcon={Users} title="Members">
          <ul className="divide-y divide-border pt-1">
            {members.map((m) => (
              <li key={m.email} className="flex items-center gap-3 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3a3f52] to-[#22262f] text-[11px] font-semibold">
                  {m.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">{m.name}</span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">
                    {m.email}
                  </span>
                </span>
                <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-[11.5px] text-muted-foreground">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
