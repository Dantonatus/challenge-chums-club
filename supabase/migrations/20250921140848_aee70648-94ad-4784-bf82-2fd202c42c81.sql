-- Fix infinite recursion in profiles RLS policies
-- The issue is that the SELECT policy references the profiles table itself

-- Drop the problematic policy first
DROP POLICY IF EXISTS "Users can view profiles based on privacy settings" ON public.profiles;

-- Create a simplified policy that avoids self-referencing queries
-- For now, allow users to see their own profile and public profiles
CREATE POLICY "Users can view profiles based on privacy settings" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  id = auth.uid() OR  -- Users can always see their own profile
  (privacy_settings ->> 'profile_visibility') = 'public'  -- Public profiles
);

-- Also ensure the update policy is simple and correct
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());