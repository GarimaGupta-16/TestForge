'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

export function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const rawRedirect = searchParams.get('redirectTo') ?? '/'
  const redirectTo =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes(':')
      ? rawRedirect
      : '/'

  const authErrorParam = searchParams.get('error')
  if (authErrorParam === 'oauth_failed' && !error) {
    setError('GitHub authentication failed. Please try again.')
  } else if (authErrorParam === 'confirmation_failed' && !error) {
    setError('Email verification link is invalid or has expired. Please sign in or request a new confirmation link.')
  }

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError(signInError.message)
        } else {
          router.push(redirectTo)
          router.refresh()
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })
        if (signUpError) {
          setError(signUpError.message)
        } else {
          setMessage('Account created! Sign in to access your workspace.')
          setMode('signin')
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGitHubAuth = async () => {
    setError(null)
    setLoading(true)
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })
      if (oauthErr) {
        setError(oauthErr.message)
        setLoading(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card/60 p-6 shadow-2xl backdrop-blur-2xl">
      {/* Auth Tabs */}
      <div className="mb-6 flex rounded-lg border border-border bg-secondary/40 p-1">
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setError(null)
            setMessage(null)
          }}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-all ${
            mode === 'signin'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setError(null)
            setMessage(null)
          }}
          className={`flex-1 rounded-md py-1.5 text-[13px] font-medium transition-all ${
            mode === 'signup'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Error & Message Banners */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-[12.5px] text-success">
          {message}
        </div>
      )}

      {/* GitHub OAuth Button */}
      <button
        type="button"
        onClick={handleGitHubAuth}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-secondary/60 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-secondary disabled:opacity-50"
      >
        <GithubIcon className="size-4" />
        Continue with GitHub
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === 'signup' && (
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Garima Gupta"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background/80 py-2 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              placeholder="developer@testforge.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/80 py-2 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/80 py-2 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {mode === 'signup' && (
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background/80 py-2 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              {mode === 'signin' ? 'Sign In to TestForge' : 'Create Account'}
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
