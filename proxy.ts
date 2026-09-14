import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const PROTECTED_ROUTES = [
  '/',
  '/repositories',
  '/test-cases',
  '/test-runs',
  '/reports',
  '/ai-agent',
  '/test-insights',
  '/failure-analysis',
  '/settings',
]

/**
 * Next.js 16 Root Proxy Request Interceptor.
 * Refreshes Supabase SSR session, inspects authentication claims via getClaims(),
 * and enforces server-side route protection.
 */
export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request)
  const { pathname, search } = request.nextUrl

  // Exclude static assets and internal Next.js paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return response
  }

  const isAuthenticated = Boolean(claims && claims.sub)

  // Check if current path matches protected route
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(route))
  )

  if (!isAuthenticated && isProtectedRoute) {
    // Sanitize redirect target to prevent open redirect vulnerabilities
    const rawTarget = `${pathname}${search}`
    const sanitizedTarget =
      rawTarget.startsWith('/') && !rawTarget.startsWith('//') && !rawTarget.includes(':')
        ? rawTarget
        : '/'

    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', sanitizedTarget)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
