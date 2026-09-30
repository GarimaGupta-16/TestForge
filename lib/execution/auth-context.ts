/**
 * ExecutionAuthContext
 *
 * Request-independent authentication context passed from an authenticated
 * Next.js HTTP user request into background execution tasks.
 *
 * Security Rules:
 * 1. Server-only execution state.
 * 2. Contains ONLY the short-lived user access token required for RLS authorization.
 * 3. Never persisted to database, local storage, or browser responses.
 * 4. Never logged or exposed in query params/headers to external clients.
 */
export interface ExecutionAuthContext {
  userId: string
  accessToken: string
}
