import { ArrowUpRight, Plus, Sparkles } from 'lucide-react'
import { GithubMark } from '@/components/github-mark'
import { GhostButton, Meter, PageHeader, PrimaryButton } from '@/components/primitives'
import { repositories } from '@/lib/data'

export const metadata = { title: 'Repositories · TestPilot AI' }

export default function RepositoriesPage() {
  return (
    <>
      <PageHeader
        crumb="Repositories"
        title="Repositories"
        description="Connect your GitHub projects and let TestPilot understand them."
        action={<PrimaryButton icon={Plus}>Connect repository</PrimaryButton>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {repositories.map((repo) => (
          <article key={repo.name} className="panel flex flex-col p-5">
            <div className="flex items-start justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                <GithubMark className="size-[17px] text-foreground/80" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/12 px-2 py-1 text-[11.5px] font-medium text-[#a58cff]">
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                {repo.state}
              </span>
            </div>

            <h2 className="mt-4 text-[19px] font-semibold">{repo.name}</h2>
            <p className="mt-1.5 font-mono text-[11.5px] text-muted-foreground">{repo.slug}</p>

            <p className="mt-4 text-[12.5px] text-muted-foreground">{repo.stack.join(' · ')}</p>

            <dl className="mt-5 space-y-2.5 border-t border-border pt-4 text-[12.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Tests</dt>
                <dd className="font-semibold tabular-nums">{repo.tests}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Pass rate</dt>
                <dd className="font-semibold tabular-nums">{repo.passRate}%</dd>
              </div>
              <Meter value={repo.passRate} tone={repo.passRate >= 90 ? 'green' : 'amber'} />
              <div className="flex items-center justify-between pt-1">
                <dt className="text-muted-foreground">Routes mapped</dt>
                <dd className="tabular-nums">{repo.routes}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Last analyzed</dt>
                <dd>{repo.lastAnalyzed}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
              <PrimaryButton icon={Sparkles} className="px-3 py-2 text-[12.5px]">
                Analyze
              </PrimaryButton>
              <GhostButton icon={ArrowUpRight}>Open</GhostButton>
            </div>
          </article>
        ))}

        <button
          type="button"
          className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-foreground"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
            <Plus className="size-5" />
          </span>
          <span className="text-[13.5px] font-medium">Connect another repository</span>
          <span className="max-w-[220px] text-center text-[12px] leading-relaxed">
            TestPilot maps routes and generates a plan within minutes.
          </span>
        </button>
      </div>
    </>
  )
}
