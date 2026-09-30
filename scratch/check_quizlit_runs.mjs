import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars:', { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey })
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectRuns() {
  let { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'developer@testforge.dev',
    password: 'password123',
  })

  if (authErr) {
    console.log('SignIn error:', authErr.message, 'trying signUp...')
    const res = await supabase.auth.signUp({
      email: 'developer@testforge.dev',
      password: 'password123',
    })
    auth = res.data
    authErr = res.error
  }

  if (authErr || !auth?.user) {
    console.error('Auth error:', authErr)
    return
  }

  console.log('Authenticated User ID:', auth.user.id)

  const { data: repos } = await supabase
    .from('repositories')
    .select('id, name, full_name')
    .eq('user_id', auth.user.id)

  console.log('User Repositories:', repos)

  const { data: runs, error: runsErr } = await supabase
    .from('test_runs')
    .select('*')
    .order('started_at', { ascending: false })

  console.log('All Test Runs:', runs, runsErr)

  if (runs && runs.length > 0) {
    for (const run of runs) {
      console.log(`\nRun ${run.id}`)
      console.log(`  Repo ID: ${run.repository_id}`)
      console.log(`  Status: ${run.status} | Trigger: ${run.trigger_type} | Branch: ${run.branch} | Commit: ${run.commit_sha}`)
      console.log(`  Tests: Total=${run.total_tests}, Passed=${run.passed_tests}, Failed=${run.failed_tests}, Skipped=${run.skipped_tests}`)
      console.log(`  Duration: ${run.duration_seconds}s | Started: ${run.started_at} | Completed: ${run.completed_at}`)

      const { data: results } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_run_id', run.id)
      console.log(`  Results count: ${results?.length || 0}`)
      if (results) {
        for (const res of results) {
          console.log(`    Result ${res.id}`)
          console.log(`      Title: "${res.test_title}"`)
          console.log(`      Status: ${res.status} | Duration: ${res.duration_ms}ms | Test Case ID: ${res.test_case_id}`)
          if (res.error_message) {
            console.log(`      Error: ${res.error_message}`)
          }
          if (res.stack_trace) {
            console.log(`      Stack: ${res.stack_trace.slice(0, 100)}...`)
          }
          const { data: artifacts } = await supabase
            .from('test_artifacts')
            .select('*')
            .eq('test_result_id', res.id)
          console.log(`      Artifacts count: ${artifacts?.length || 0}`)
          if (artifacts) {
            for (const art of artifacts) {
              console.log(`        Artifact ${art.id} | Type: ${art.type} | File: ${art.file_name} | Path: ${art.storage_path} | Size: ${art.file_size_bytes}B`)
            }
          }
        }
      }
    }
  }
}

inspectRuns()
