-- Fix RLS policy issues for challenges and profiles

-- First, let's check if user is properly authenticated and has group membership
-- Update the challenges INSERT policy to be more specific
DROP POLICY IF EXISTS "Members can create challenges" ON public.challenges;

CREATE POLICY "Members can create challenges" 
ON public.challenges 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by = auth.uid() 
  AND is_group_member(group_id, auth.uid())
);

-- Also ensure the group membership function works correctly by checking if it exists
-- Fix the profiles UPDATE policy that might be causing recursion
DROP POLICY IF EXISTS "Enhanced profile privacy with user preferences" ON public.profiles;

CREATE POLICY "Users can view profiles based on privacy settings" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  id = auth.uid() OR
  CASE 
    WHEN (privacy_settings ->> 'profile_visibility') = 'public' THEN true
    WHEN (privacy_settings ->> 'profile_visibility') = 'friends_and_groups' THEN (
      EXISTS (
        SELECT 1 FROM user_friends uf 
        WHERE ((uf.user_id = auth.uid() AND uf.friend_user_id = profiles.id) 
               OR (uf.friend_user_id = auth.uid() AND uf.user_id = profiles.id))
        AND uf.status = 'accepted'
      ) OR
      EXISTS (
        SELECT 1 FROM group_members gm1 
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
      )
    )
    WHEN (privacy_settings ->> 'profile_visibility') = 'groups_only' THEN (
      EXISTS (
        SELECT 1 FROM group_members gm1 
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
      )
    )
    ELSE false
  END
);

-- Ensure users can update their own profiles without recursion
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Make sure challenge participants can be added properly
DROP POLICY IF EXISTS "Member can add self to challenge" ON public.challenge_participants;

CREATE POLICY "Member can add self to challenge" 
ON public.challenge_participants 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM challenges c 
    WHERE c.id = challenge_participants.challenge_id 
    AND is_group_member(c.group_id, auth.uid())
  )
);