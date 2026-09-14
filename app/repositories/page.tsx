import { ArrowUpRight, Plus, Sparkles } from 'lucide-react'
import { GithubMark } from '@/components/github-mark'
import { GhostButton, Meter, PageHeader, PrimaryButton } from '@/components/primitives'
import { repositories } from '@/lib/data'

export const metadata = { title: 'Repositories · TestForge' }

export default function RepositoriesPage() {
  return (
    <>
      <PageHeader
        crumb="Repositories"
        title="Repositories"
        description="Connect your GitHub projects and let TestForge understand them."
        action={<PrimaryButton icon={Plus}>Connect repository</PrimaryButton>}
      />


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {repositories.map((repo) => (
          <article key={repo.name} className="panel flex flex-col p-5 transition-all duration-150 hover:border-border-strong">
            <div className="flex items-start justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/80">
                <GithubMark className="size-[17px] text-foreground" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-medium text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                {repo.state}
              </span>
            </div>

            <h2 className="mt-4 text-lg font-bold text-foreground">{repo.name}</h2>
            <p className="mt-1 font-mono text-[11.5px] text-muted-foreground">{repo.slug}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {repo.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded border border-border/70 bg-secondary/40 px-2 py-0.5 font-mono text-[10.5px] font-medium text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-border/60 pt-4 text-[12.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Tests</dt>
                <dd className="font-semibold font-mono tabular-nums text-foreground">{repo.tests}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Pass rate</dt>
                <dd className="font-semibold font-mono tabular-nums text-foreground">{repo.passRate}%</dd>
              </div>
              <Meter value={repo.passRate} tone={repo.passRate >= 90 ? 'green' : 'amber'} />
              <div className="flex items-center justify-between pt-1">
                <dt className="text-muted-foreground">Routes mapped</dt>
                <dd className="font-mono tabular-nums text-foreground">{repo.routes}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Last analyzed</dt>
                <dd className="font-mono text-muted-foreground">{repo.lastAnalyzed}</dd>
              </div>
            </dl>

            <div className="mt-auto flex items-center gap-2 border-t border-border/60 pt-4">
              <PrimaryButton icon={Sparkles} className="px-3 py-1.5 text-[12.5px]">
                Analyze
              </PrimaryButton>
              <GhostButton icon={ArrowUpRight}>Open</GhostButton>
            </div>
          </article>
        ))}

        <button
          type="button"
          className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong/70 text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary/20 hover:text-foreground"
        >
          <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-secondary">
            <Plus className="size-5 text-primary" />
          </span>
          <span className="text-[13.5px] font-semibold text-foreground">Connect another repository</span>
          <span className="max-w-[220px] text-center text-[12px] leading-relaxed text-muted-foreground">
            TestForge maps routes and generates a plan within minutes.
          </span>

        </button>
      </div>
    </>
  )
}

