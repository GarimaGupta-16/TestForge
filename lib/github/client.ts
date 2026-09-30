import 'server-only'
import type { User } from '@supabase/supabase-js'
import type { Octokit } from 'octokit'
import { getOctokitApp, getGitHubAppStatus } from './app'
import type {
  GitHubInstallationInfo,
  GetInstallationInfoResult,
  GetInstallationErrorCode,
  GitHubRepositoryMetadata,
  GitHubAppStatus,
  GitHubTreeEntry,
  GitHubTreeResponse,
  GitHubFileContentResponse,
} from './types'

/**
 * Server-side GitHub API Client Abstraction built on Octokit.
 * Manages GitHub App and Installation authentication securely on the server.
 */

/**
 * Returns an Octokit instance authenticated as the GitHub App.
 * Used for App-level operations (such as inspecting App metadata or listing installations).
 */
export async function getAppOctokit(): Promise<Octokit | null> {
  const app = getOctokitApp()
  if (!app) return null
  return app.octokit
}

/**
 * Returns an Octokit instance authenticated for a specific GitHub Installation ID.
 * Octokit manages short-lived installation access tokens internally on the server.
 * Tokens are never persisted to Supabase or sent to the browser.
 */
export async function getInstallationOctokit(installationId: number): Promise<Octokit | null> {
  const app = getOctokitApp()
  if (!app) return null

  try {
    return await app.getInstallationOctokit(installationId)
  } catch (error) {
    console.error(`Failed to create Octokit instance for installation ${installationId}`)
    return null
  }
}

/**
 * Retrieves information about a GitHub App installation given a verified installation ID.
 * Scoped strictly through the configured TestForge-Automation GitHub App authentication.
 * Returns a structured result distinguishing status codes (unconfigured, 404, 401, 403, error).
 */
export async function getInstallationInfo(installationId: number): Promise<GetInstallationInfoResult> {
  const appOctokit = await getAppOctokit()
  if (!appOctokit) {
    return { installation: null, errorCode: 'unconfigured' }
  }

  try {
    const { data: installation } = await appOctokit.rest.apps.getInstallation({
      installation_id: installationId,
    })

    const accountId = installation.account && 'id' in installation.account ? Number(installation.account.id) : 0
    const accountLogin = installation.account && 'login' in installation.account ? String(installation.account.login) : ''
    const accountType = installation.account && 'type' in installation.account ? String(installation.account.type) : 'User'
    const suspendedAt = installation.suspended_at ? String(installation.suspended_at) : null
    const isActive = !suspendedAt

    const info: GitHubInstallationInfo = {
      id: installation.id,
      accountId,
      accountLogin,
      accountType,
      repositorySelection: installation.repository_selection as 'all' | 'selected',
      permissions: installation.permissions as Record<string, string>,
      suspendedAt,
      isActive,
    }

    return { installation: info, errorCode: null }
  } catch (error: any) {
    // Safe structured diagnostic logging without printing tokens, keys, or raw headers
    console.error('[GitHub Client] getInstallationInfo failed', {
      status: error?.status ?? null,
      name: error?.name ?? null,
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })

    let errorCode: GetInstallationErrorCode = 'error'
    if (error?.status === 401) {
      errorCode = 'unauthorized'
    } else if (error?.status === 403) {
      errorCode = 'forbidden'
    } else if (error?.status === 404) {
      errorCode = 'not_found'
    }

    return { installation: null, errorCode }
  }
}

/**
 * Server-only security helper to extract the verified GitHub provider_id
 * from the authenticated Supabase User identities array.
 *
 * SECURITY RULE:
 * - Must NOT inspect user_metadata (user-editable).
 * - Must NOT inspect email or match email strings.
 * - Returns stable numerical provider account ID as a string, or null if no GitHub identity is linked.
 */
export function extractGitHubIdentityId(user: User | null): string | null {
  if (!user || !user.identities || !Array.isArray(user.identities)) {
    return null
  }

  const githubIdentity = user.identities.find(
    (identity) => identity.provider === 'github'
  )

  if (!githubIdentity) {
    return null
  }

  const providerId =
    (githubIdentity as any).provider_id ||
    githubIdentity.identity_data?.sub ||
    githubIdentity.identity_data?.provider_id ||
    githubIdentity.id

  if (!providerId) {
    return null
  }

  return String(providerId)
}

/**
 * Lists repositories accessible to a verified GitHub App installation ID.
 * Uses Octokit pagination to retrieve all accessible repositories across pages.
 */
export async function listInstallationRepositories(
  installationId: number
): Promise<GitHubRepositoryMetadata[]> {
  const octokit = await getInstallationOctokit(installationId)
  if (!octokit) return []

  try {
    const rawRepos = await octokit.paginate(
      octokit.rest.apps.listReposAccessibleToInstallation,
      { per_page: 100 }
    )

    return rawRepos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: Boolean(repo.private),
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch || 'main',
      owner: {
        login: repo.owner?.login || '',
        id: repo.owner?.id || 0,
      },
      description: repo.description ?? null,
      language: repo.language ?? null,
    }))
  } catch (error: any) {
    console.error('[GitHub Client] listInstallationRepositories failed', {
      status: error?.status ?? null,
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return []
  }
}

/**
 * Searches all installations for the GitHub App to find an active installation
 * matching the given GitHub numerical account ID.
 * Returns structured installation details (including htmlUrl) if found, or null if no active installation exists.
 */
export async function findInstallationForAccount(
  accountId: number
): Promise<{ id: number; htmlUrl: string } | null> {
  const appOctokit = await getAppOctokit()
  if (!appOctokit) {
    return null
  }

  try {
    const { data: installations } = await appOctokit.rest.apps.listInstallations({
      per_page: 100,
    })

    const matchingInstallation = installations.find((inst) => {
      const instAccountId = inst.account && 'id' in inst.account ? Number(inst.account.id) : 0
      const isActive = !inst.suspended_at
      return instAccountId === accountId && isActive
    })

    if (!matchingInstallation) {
      return null
    }

    const htmlUrl =
      matchingInstallation.html_url ||
      `https://github.com/settings/installations/${matchingInstallation.id}`

    return {
      id: matchingInstallation.id,
      htmlUrl,
    }
  } catch (error: any) {
    console.error('[GitHub Client] findInstallationForAccount failed', {
      status: error?.status ?? null,
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return null
  }
}


/**
 * Verifies whether the GitHub App server configuration is complete.
 */
export function checkGitHubAppConfiguration(): GitHubAppStatus {
  return getGitHubAppStatus()
}

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg', 'bmp', 'tiff', 'psd',
  'pdf', 'zip', 'tar', 'gz', '7z', 'rar', 'mp3', 'mp4', 'avi', 'mov',
  'exe', 'dll', 'so', 'dylib', 'bin', 'iso', 'ttf', 'woff', 'woff2', 'eot',
  'pyc', 'class', 'db', 'sqlite'
])

export function isBinaryExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? BINARY_EXTENSIONS.has(ext) : false
}

export function containsNullBytes(str: string): boolean {
  return str.includes('\0')
}

/**
 * Retrieves default branch and Git repository tree for an owner/repo
 * accessible to the given installation ID.
 * Supports recursive tree fetching and server-side subtree fallback for truncated trees.
 */
export async function getRepositoryTree(
  installationId: number,
  owner: string,
  repo: string,
  requestedRef?: string
): Promise<{ success: boolean; status: number; data: GitHubTreeResponse | null; message?: string }> {
  const octokit = await getInstallationOctokit(installationId)
  if (!octokit) {
    return { success: false, status: 500, data: null, message: 'Failed to initialize GitHub client.' }
  }

  try {
    // 1. Verify repository access and retrieve default branch
    const { data: repoMeta } = await octokit.rest.repos.get({ owner, repo })
    const defaultBranch = repoMeta.default_branch || 'main'
    const treeRef = requestedRef || defaultBranch

    // 2. Fetch recursive Git tree starting from defaultBranch/ref
    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: treeRef,
      recursive: 'true',
    })

    let isTruncated = Boolean(treeData.truncated)
    let rawEntries: Array<any> = Array.isArray(treeData.tree) ? [...treeData.tree] : []

    // 3. Fallback subtree traversal if recursive tree was truncated
    if (isTruncated && rawEntries.length < 25000) {
      const existingPaths = new Set(rawEntries.map((e) => e.path))
      const dirEntries = rawEntries.filter((e) => e.type === 'tree' && e.sha)

      for (const dir of dirEntries) {
        if (rawEntries.length >= 25000) break
        try {
          const { data: subTreeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: dir.sha,
          })
          if (Array.isArray(subTreeData.tree)) {
            for (const subItem of subTreeData.tree) {
              const fullPath = `${dir.path}/${subItem.path}`
              if (!existingPaths.has(fullPath)) {
                existingPaths.add(fullPath)
                rawEntries.push({ ...subItem, path: fullPath })
              }
            }
          }
        } catch {
          // Ignore individual subtree fetch errors
        }
      }
    }

    const tree: GitHubTreeEntry[] = rawEntries.map((entry) => ({
      path: entry.path,
      type: entry.type === 'blob' ? 'file' : entry.type,
      size: entry.size,
      sha: entry.sha,
      mode: entry.mode,
    }))

    return {
      success: true,
      status: 200,
      data: {
        owner,
        repo,
        defaultBranch,
        isPrivate: Boolean(repoMeta.private),
        description: repoMeta.description ?? null,
        truncated: isTruncated,
        tree,
      },
    }
  } catch (error: any) {
    const status = error?.status ?? 500
    console.error('[GitHub Client] getRepositoryTree failed', {
      owner,
      repo,
      status,
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return {
      success: false,
      status,
      data: null,
      message: status === 404 ? 'Repository not found or access denied.' : 'Failed to fetch repository tree.',
    }
  }
}

/**
 * Retrieves content for a single source file from an installation-accessible repository.
 * Enforces 500 KB size cap and binary detection.
 */
export async function getRepositoryFileContent(
  installationId: number,
  owner: string,
  repo: string,
  path: string,
  requestedRef?: string
): Promise<{ success: boolean; status: number; data: GitHubFileContentResponse | null; message?: string }> {
  const octokit = await getInstallationOctokit(installationId)
  if (!octokit) {
    return { success: false, status: 500, data: null, message: 'Failed to initialize GitHub client.' }
  }

  if (isBinaryExtension(path)) {
    return {
      success: true,
      status: 200,
      data: {
        path,
        name: path.split('/').pop() || path,
        size: 0,
        encoding: 'none',
        content: null,
        isBinary: true,
        isTooLarge: false,
        sha: '',
        message: 'Binary file extension not supported for source inspection.',
      },
    }
  }

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: requestedRef,
    })

    if (Array.isArray(data)) {
      return {
        success: false,
        status: 400,
        data: null,
        message: 'Requested path is a directory, not a file.',
      }
    }

    if (data.type !== 'file') {
      return {
        success: false,
        status: 400,
        data: null,
        message: `Requested path is a ${data.type}, not a regular file.`,
      }
    }

    const MAX_FILE_SIZE_BYTES = 500 * 1024
    if (data.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: true,
        status: 200,
        data: {
          path: data.path,
          name: data.name,
          size: data.size,
          encoding: 'none',
          content: null,
          isBinary: false,
          isTooLarge: true,
          sha: data.sha,
          message: 'File size exceeds 500 KB limit.',
        },
      }
    }

    if (!data.content) {
      return {
        success: true,
        status: 200,
        data: {
          path: data.path,
          name: data.name,
          size: data.size,
          encoding: 'utf-8',
          content: '',
          isBinary: false,
          isTooLarge: false,
          sha: data.sha,
        },
      }
    }

    const decodedText = Buffer.from(data.content, 'base64').toString('utf-8')

    if (containsNullBytes(decodedText)) {
      return {
        success: true,
        status: 200,
        data: {
          path: data.path,
          name: data.name,
          size: data.size,
          encoding: 'none',
          content: null,
          isBinary: true,
          isTooLarge: false,
          sha: data.sha,
          message: 'File contains binary data.',
        },
      }
    }

    return {
      success: true,
      status: 200,
      data: {
        path: data.path,
        name: data.name,
        size: data.size,
        encoding: 'utf-8',
        content: decodedText,
        isBinary: false,
        isTooLarge: false,
        sha: data.sha,
      },
    }
  } catch (error: any) {
    const status = error?.status ?? 500
    console.error('[GitHub Client] getRepositoryFileContent failed', {
      owner,
      repo,
      path,
      status,
      message: typeof error?.message === 'string' ? error.message.slice(0, 200) : null,
    })
    return {
      success: false,
      status,
      data: null,
      message: status === 404 ? 'File not found or access denied.' : 'Failed to fetch file content.',
    }
  }
}

export async function resolveRepositoryCommitInfo(
  installationId: number,
  owner: string,
  repo: string
): Promise<{ branch: string; commitSha: string }> {
  const octokit = await getInstallationOctokit(installationId)
  if (!octokit) {
    return { branch: 'main', commitSha: 'HEAD' }
  }

  try {
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
    const branch = repoData.default_branch || 'main'

    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    })

    const commitSha = refData.object.sha || 'HEAD'
    return { branch, commitSha }
  } catch (err) {
    console.error('Failed to resolve repository commit info:', err)
    return { branch: 'main', commitSha: 'HEAD' }
  }
}
