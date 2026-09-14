-- TestForge Schema Migration: 20260914000000_initial_schema.sql
-- Canonical database schema for Phase 2 Database Foundation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. PROFILES (Extends auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. REPOSITORIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  default_branch TEXT NOT NULL DEFAULT 'main',
  is_private BOOLEAN NOT NULL DEFAULT false,
  framework TEXT NOT NULL DEFAULT 'Next.js',
  language TEXT NOT NULL DEFAULT 'TypeScript',
  status TEXT NOT NULL DEFAULT 'active',
  test_count INTEGER NOT NULL DEFAULT 0,
  passing_count INTEGER NOT NULL DEFAULT 0,
  failing_count INTEGER NOT NULL DEFAULT 0,
  health_score INTEGER NOT NULL DEFAULT 100,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. REPOSITORY_ANALYSIS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repository_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  components_analyzed INTEGER NOT NULL DEFAULT 0,
  api_routes_found INTEGER NOT NULL DEFAULT 0,
  e2e_coverage_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4. TEST_CASES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'e2e',
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'passing',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5. TEST_RUNS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  branch TEXT NOT NULL DEFAULT 'main',
  commit_sha TEXT,
  status TEXT NOT NULL DEFAULT 'passed',
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed_tests INTEGER NOT NULL DEFAULT 0,
  failed_tests INTEGER NOT NULL DEFAULT 0,
  skipped_tests INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 6. TEST_RESULTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES public.test_cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'passed',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  error_stack TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. TEST_ARTIFACTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID NOT NULL REFERENCES public.test_results(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 8. FAILURES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  test_result_id UUID REFERENCES public.test_results(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  component_affected TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  severity TEXT NOT NULL DEFAULT 'high',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 9. AI_ANALYSES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_id UUID NOT NULL REFERENCES public.failures(id) ON DELETE CASCADE,
  root_cause TEXT NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL DEFAULT 0.95,
  suggested_fix TEXT NOT NULL,
  analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 10. AI_REPAIRS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_id UUID NOT NULL REFERENCES public.failures(id) ON DELETE CASCADE,
  ai_analysis_id UUID REFERENCES public.ai_analyses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'drafted',
  diff_content TEXT NOT NULL,
  explanation TEXT NOT NULL,
  pull_request_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 11. PULL_REQUESTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  ai_repair_id UUID REFERENCES public.ai_repairs(id) ON DELETE SET NULL,
  pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 12. REPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'weekly',
  summary TEXT NOT NULL,
  pass_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_failures INTEGER NOT NULL DEFAULT 0,
  repairs_applied INTEGER NOT NULL DEFAULT 0,
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON public.repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_repository_analysis_repo_id ON public.repository_analysis(repository_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_repo_id ON public.test_cases(repository_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_repo_id ON public.test_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_test_results_run_id ON public.test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_case_id ON public.test_results(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_artifacts_result_id ON public.test_artifacts(test_result_id);
CREATE INDEX IF NOT EXISTS idx_failures_repo_id ON public.failures(repository_id);
CREATE INDEX IF NOT EXISTS idx_failures_result_id ON public.failures(test_result_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_failure_id ON public.ai_analyses(failure_id);
CREATE INDEX IF NOT EXISTS idx_ai_repairs_failure_id ON public.ai_repairs(failure_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_id ON public.pull_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_reports_repo_id ON public.reports(repository_id);

-- =============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS INSERT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- 2. Repositories Policies
CREATE POLICY "Users can view their own repositories" ON public.repositories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repositories" ON public.repositories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repositories" ON public.repositories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own repositories" ON public.repositories
  FOR DELETE USING (auth.uid() = user_id);

-- Helper macro logic via subqueries for child tables referencing repositories:

-- 3. Repository Analysis Policies
CREATE POLICY "Users can view analysis of their repositories" ON public.repository_analysis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repository_analysis.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can insert analysis for their repositories" ON public.repository_analysis
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repository_analysis.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can update analysis of their repositories" ON public.repository_analysis
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repository_analysis.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can delete analysis of their repositories" ON public.repository_analysis
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = repository_analysis.repository_id AND r.user_id = auth.uid())
  );

-- 4. Test Cases Policies
CREATE POLICY "Users can view test cases of their repositories" ON public.test_cases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = test_cases.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can insert test cases for their repositories" ON public.test_cases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = test_cases.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can update test cases of their repositories" ON public.test_cases
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = test_cases.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can delete test cases of their repositories" ON public.test_cases
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = test_cases.repository_id AND r.user_id = auth.uid())
  );

-- 5. Test Runs Policies
CREATE POLICY "Users can view test runs of their repositories" ON public.test_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = test_runs.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can insert test runs for their repositories" ON public.test_runs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = test_runs.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can update test runs of their repositories" ON public.test_runs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = test_runs.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can delete test runs of their repositories" ON public.test_runs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = test_runs.repository_id AND r.user_id = auth.uid())
  );

-- 6. Test Results Policies (via test_runs -> repositories)
CREATE POLICY "Users can view test results of their repositories" ON public.test_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_runs tr
      JOIN public.repositories r ON r.id = tr.repository_id
      WHERE tr.id = test_results.test_run_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert test results for their repositories" ON public.test_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_runs tr
      JOIN public.repositories r ON r.id = tr.repository_id
      WHERE tr.id = test_results.test_run_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update test results of their repositories" ON public.test_results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.test_runs tr
      JOIN public.repositories r ON r.id = tr.repository_id
      WHERE tr.id = test_results.test_run_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete test results of their repositories" ON public.test_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.test_runs tr
      JOIN public.repositories r ON r.id = tr.repository_id
      WHERE tr.id = test_results.test_run_id AND r.user_id = auth.uid()
    )
  );

-- 7. Test Artifacts Policies (via test_results -> test_runs -> repositories)
CREATE POLICY "Users can view test artifacts of their repositories" ON public.test_artifacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_results tres
      JOIN public.test_runs tr ON tr.id = tres.test_run_id
      JOIN public.repositories r ON r.id = tr.repository_id
      WHERE tres.id = test_artifacts.test_result_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert test artifacts for their repositories" ON public.test_artifacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_results tres
      JOIN public.test_runs tr ON tr.id = tres.test_run_id
      JOIN public.repositories r ON r.id = tr.repository_id
      WHERE tres.id = test_artifacts.test_result_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update test artifacts of their repositories" ON public.test_artifacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.test_results tres
      JOIN public.test_runs tr ON tr.id = tres.test_run_id
      JOIN public.repositories r ON r.id = tr.repository_id
      WHERE tres.id = test_artifacts.test_result_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete test artifacts of their repositories" ON public.test_artifacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.test_results tres
      JOIN public.test_runs tr ON tr.id = tres.test_run_id
      JOIN public.repositories r ON r.id = tr.repository_id
      WHERE tres.id = test_artifacts.test_result_id AND r.user_id = auth.uid()
    )
  );

-- 8. Failures Policies
CREATE POLICY "Users can view failures of their repositories" ON public.failures
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = failures.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can insert failures for their repositories" ON public.failures
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = failures.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can update failures of their repositories" ON public.failures
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = failures.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can delete failures of their repositories" ON public.failures
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = failures.repository_id AND r.user_id = auth.uid())
  );

-- 9. AI Analyses Policies (via failures -> repositories)
CREATE POLICY "Users can view AI analyses of their repositories" ON public.ai_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.failures f
      JOIN public.repositories r ON r.id = f.repository_id
      WHERE f.id = ai_analyses.failure_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert AI analyses for their repositories" ON public.ai_analyses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.failures f
      JOIN public.repositories r ON r.id = f.repository_id
      WHERE f.id = ai_analyses.failure_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update AI analyses of their repositories" ON public.ai_analyses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.failures f
      JOIN public.repositories r ON r.id = f.repository_id
      WHERE f.id = ai_analyses.failure_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete AI analyses of their repositories" ON public.ai_analyses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.failures f
      JOIN public.repositories r ON r.id = f.repository_id
      WHERE f.id = ai_analyses.failure_id AND r.user_id = auth.uid()
    )
  );

-- 10. AI Repairs Policies (via failures -> repositories)
CREATE POLICY "Users can view AI repairs of their repositories" ON public.ai_repairs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.failures f
      JOIN public.repositories r ON r.id = f.repository_id
      WHERE f.id = ai_repairs.failure_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert AI repairs for their repositories" ON public.ai_repairs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.failures f
      JOIN public.repositories r ON r.id = f.repository_id
      WHERE f.id = ai_repairs.failure_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update AI repairs of their repositories" ON public.ai_repairs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.failures f
      JOIN public.repositories r ON r.id = f.repository_id
      WHERE f.id = ai_repairs.failure_id AND r.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete AI repairs of their repositories" ON public.ai_repairs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.failures f
      JOIN public.repositories r ON r.id = f.repository_id
      WHERE f.id = ai_repairs.failure_id AND r.user_id = auth.uid()
    )
  );

-- 11. Pull Requests Policies
CREATE POLICY "Users can view pull requests of their repositories" ON public.pull_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = pull_requests.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can insert pull requests for their repositories" ON public.pull_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = pull_requests.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can update pull requests of their repositories" ON public.pull_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = pull_requests.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can delete pull requests of their repositories" ON public.pull_requests
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = pull_requests.repository_id AND r.user_id = auth.uid())
  );

-- 12. Reports Policies
CREATE POLICY "Users can view reports of their repositories" ON public.reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = reports.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can insert reports for their repositories" ON public.reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = reports.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can update reports of their repositories" ON public.reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = reports.repository_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can delete reports of their repositories" ON public.reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = reports.repository_id AND r.user_id = auth.uid())
  );
