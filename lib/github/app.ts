import 'server-only'
import { App } from 'octokit'
import type { GitHubAppConfig, GitHubAppStatus } from './types'

/**
 * Normalizes private key strings from environment variables,
 * handling escaped newlines (\n) if present.
 */
function normalizePrivateKey(key: string): string {
  let k = key.trim()

  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1)
  }

  return k.replace(/\\n/g, '\n').trim()
}

/**
 * Retrieves server-side GitHub App configuration from environment variables.
 * Returns null if credentials are missing or unconfigured.
 */
export function getGitHubAppConfig(): GitHubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID?.trim()
  const privateKeyRaw = process.env.GITHUB_APP_PRIVATE_KEY
  const slug = process.env.GITHUB_APP_SLUG?.trim()

  if (!appId || !privateKeyRaw) {
    return null
  }

  const privateKey = normalizePrivateKey(privateKeyRaw)
  if (!privateKey) {
    return null
  }

  return { appId, privateKey, slug }
}

/**
 * Constructs the GitHub App installation URL if GITHUB_APP_SLUG is configured.
 * Example: https://github.com/apps/TestForge-Automation/installations/new
 */
export function getGitHubAppInstallUrl(): string | null {
  const slug = process.env.GITHUB_APP_SLUG?.trim()
  if (!slug) {
    return null
  }
  return `https://github.com/apps/${slug}/installations/new`
}

/**
 * Inspects GitHub App configuration status without throwing errors or exposing secrets.
 */
export function getGitHubAppStatus(): GitHubAppStatus {
  const config = getGitHubAppConfig()

  if (!config) {
    return {
      isConfigured: false,
      state: 'unconfigured',
      message: 'GitHub App credentials (GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY) are missing in environment variables.',
    }
  }

  return {
    isConfigured: true,
    state: 'not_installed',
    message: 'GitHub App is configured on server.',
  }
}

/**
 * Returns an authenticated Octokit App instance using server environment credentials.
 * Octokit handles JWT generation, token caching, and automatic renewal.
 */
export function getOctokitApp(): App | null {
  const config = getGitHubAppConfig()
  if (!config) {
    return null
  }

  try {
    return new App({
      appId: config.appId,
      privateKey: config.privateKey,
    })
  } catch (error) {
    console.error('Failed to initialize Octokit App instance')
    return null
  }
}
