/**
 * Server- and client-safe validation helper for repository target application URLs.
 * Enforces http/https protocols, rejects credentials and malformed URLs,
 * and normalizes trailing slashes consistently.
 */

export interface UrlValidationResult {
  isValid: boolean
  normalizedUrl: string | null
  error: string | null
}

export function validateTargetUrl(rawUrl: string | null | undefined): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, normalizedUrl: null, error: 'URL is required.' }
  }

  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { isValid: false, normalizedUrl: null, error: 'URL cannot be empty.' }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { isValid: false, normalizedUrl: null, error: 'Invalid URL format.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, normalizedUrl: null, error: 'Only HTTP and HTTPS URLs are allowed.' }
  }

  if (parsed.username || parsed.password) {
    return { isValid: false, normalizedUrl: null, error: 'URLs with embedded authentication credentials are not allowed.' }
  }

  // Normalize: origin + path (without trailing slash unless empty/slash)
  const cleanPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '')
  const normalizedUrl = `${parsed.origin}${cleanPath}${parsed.search}`

  return {
    isValid: true,
    normalizedUrl,
    error: null,
  }
}
