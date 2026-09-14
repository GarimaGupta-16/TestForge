import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })

    if (!error) {
      // Sanitize redirect target to prevent open redirect vulnerabilities
      const sanitizedTarget =
        next.startsWith('/') && !next.startsWith('//') && !next.includes(':') ? next : '/'
      return NextResponse.redirect(`${origin}${sanitizedTarget}`)
    }
  }

  // On verification failure or missing token, redirect safely to login page with error query flag
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
