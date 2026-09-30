import { CheckCircle2, AlertTriangle, Plus } from 'lucide-react'
import { PageHeader, PrimaryButton } from '@/components/primitives'
import { RepositoriesList } from '@/components/repositories-list'

export const metadata = { title: 'Repositories · TestForge' }

interface RepositoriesPageProps {
  searchParams: Promise<{ github?: string }>
}

const GITHUB_FEEDBACK_MESSAGES: Record<string, { type: 'success' | 'warning' | 'error'; message: string }> = {
  connected: {
    type: 'success',
    message: 'GitHub App connected successfully.',
  },
  verification_required: {
    type: 'warning',
    message: 'Connect your GitHub account to TestForge first, then install the GitHub App.',
  },
  identity_mismatch: {
    type: 'error',
    message: 'The GitHub App installation belongs to a different GitHub account.',
  },
  invalid_installation: {
    type: 'error',
    message: 'The GitHub App installation could not be verified.',
  },
  installation_inactive: {
    type: 'error',
    message: 'The GitHub App installation is inactive.',
  },
  not_configured: {
    type: 'warning',
    message: 'GitHub integration is not configured yet.',
  },
  github_auth_error: {
    type: 'error',
    message: 'GitHub App authentication failed. Please check server configuration.',
  },
  github_access_denied: {
    type: 'error',
    message: 'Access denied by GitHub API.',
  },
  github_error: {
    type: 'error',
    message: 'An error occurred while validating the GitHub App installation.',
  },
}

export default async function RepositoriesPage({ searchParams }: RepositoriesPageProps) {
  const { github } = await searchParams
  const feedback = github ? GITHUB_FEEDBACK_MESSAGES[github] : null

  const connectButton = (
    <a href="/api/github/connect" target="_blank" rel="noopener noreferrer">
      <PrimaryButton icon={Plus}>Connect repository</PrimaryButton>
    </a>
  )

  return (
    <>
      <PageHeader
        crumb="Repositories"
        title="Repositories"
        description="Connect your GitHub projects and let TestForge understand them."
        action={connectButton}
      />

      {feedback && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-lg border p-4 text-[13px] ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : feedback.type === 'warning'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertTriangle className="size-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <RepositoriesList />
    </>
  )
}
