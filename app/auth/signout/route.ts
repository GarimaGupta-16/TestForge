import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify authentication identity using getClaims()
  const { data: claimsData } = await supabase.auth.getClaims()

  if (claimsData?.claims) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')

  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`, {
    status: 303, // See Other: converts POST request to GET redirect
  })
}

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()

  if (claimsData?.claims) {
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')

  const origin = new URL(request.url).origin
  return NextResponse.redirect(`${origin}/login`)
}
