/**
 * TypeScript types and interfaces for TestForge GitHub App integration.
 */

export type RepositoryConnectionState = 'unconfigured' | 'not_installed' | 'installed' | 'error'

export type GetInstallationErrorCode =
  | 'unconfigured'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'error'

export interface GitHubAppConfig {
  appId: string
  privateKey: string
  slug?: string
}

export interface GitHubAppStatus {
  isConfigured: boolean
  state: RepositoryConnectionState
  message: string
}

export interface GitHubInstallationInfo {
  id: number
  accountId: number
  accountLogin: string
  accountType: string
  repositorySelection: 'all' | 'selected'
  permissions?: Record<string, string>
  suspendedAt: string | null
  isActive: boolean
}

export interface GetInstallationInfoResult {
  installation: GitHubInstallationInfo | null
  errorCode: GetInstallationErrorCode | null
}

export interface GitHubRepositoryMetadata {
  id: number
  name: string
  fullName: string
  isPrivate: boolean
  htmlUrl: string
  defaultBranch: string
  owner: {
    login: string
    id: number
  }
  description: string | null
  language: string | null
  targetUrl?: string | null
}

export interface GitHubStatusApiResponse {
  authenticated: boolean
  configured: boolean
  state: RepositoryConnectionState
  message: string
  installUrl?: string | null
}

export interface GitHubTreeEntry {
  path: string
  type: 'file' | 'tree' | 'blob' | string
  size?: number
  sha: string
  mode?: string
}

export interface GitHubTreeResponse {
  owner: string
  repo: string
  defaultBranch: string
  isPrivate?: boolean
  description?: string | null
  truncated: boolean
  tree: GitHubTreeEntry[]
}

export interface GitHubFileContentResponse {
  path: string
  name: string
  size: number
  encoding: string
  content: string | null
  isBinary: boolean
  isTooLarge: boolean
  sha: string
  message?: string
}

