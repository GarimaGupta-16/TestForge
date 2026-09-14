import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sanitize redirect target to prevent open redirects
      const sanitizedTarget =
        next.startsWith('/') && !next.startsWith('//') && !next.includes(':') ? next : '/'
      return NextResponse.redirect(`${origin}${sanitizedTarget}`)
    }
  }

  // Return user to login page with error flag if code exchange fails
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
