-- Phase 10: Add duration and tips columns to activities table
-- Both are nullable TEXT — AI generates them; not all activities will have values.
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS tips TEXT;
