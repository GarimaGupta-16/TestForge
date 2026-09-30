-- Migration: 20260930000000_add_delivery_id_to_test_runs.sql
-- Adds nullable delivery_id column and unique index for GitHub webhook idempotency to public.test_runs table.

ALTER TABLE public.test_runs ADD COLUMN IF NOT EXISTS delivery_id text UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_test_runs_running_push 
ON public.test_runs (repository_id, branch, commit_sha) 
WHERE status = 'running' AND trigger_type = 'push';
