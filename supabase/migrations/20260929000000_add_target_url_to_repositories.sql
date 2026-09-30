-- Migration: 20260929000000_add_target_url_to_repositories.sql
-- Adds nullable target_url column to public.repositories table for repository-specific execution endpoints.

ALTER TABLE public.repositories ADD COLUMN IF NOT EXISTS target_url text;
