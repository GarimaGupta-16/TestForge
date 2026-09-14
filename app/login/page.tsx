import { Suspense } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { AuthForm } from '@/components/auth/auth-form'

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background Ambient Glow */}
      <div className="absolute -top-40 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome to TestForge
        </h1>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground">
          Autonomous E2E testing platform for modern dev teams
        </p>
      </div>

      {/* Auth Form Box */}
      <Suspense
        fallback={
          <div className="flex size-32 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        }
      >
        <AuthForm />
      </Suspense>

      <footer className="mt-8 text-center text-[12px] text-muted-foreground/60">
        Protected by Supabase Auth & PostgreSQL Row Level Security
      </footer>
    </div>
  )
}
