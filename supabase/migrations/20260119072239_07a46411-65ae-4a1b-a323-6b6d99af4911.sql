-- ============================================================
-- Fix: Drop SECURITY DEFINER view and use simpler approach
-- ============================================================

-- Drop the problematic view (it was created with SECURITY DEFINER by default)
DROP VIEW IF EXISTS public.groups_safe;