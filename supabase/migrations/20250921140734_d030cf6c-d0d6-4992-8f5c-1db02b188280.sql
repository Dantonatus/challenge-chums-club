-- Fix RLS policies to allow basic functionality without group membership

-- Allow users to update their own profiles without group requirements
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow users to create personal challenges (group_id can be NULL for personal challenges)
DROP POLICY IF EXISTS "Members can create challenges" ON public.challenges;

CREATE POLICY "Members can create challenges" 
ON public.challenges 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by = auth.uid() 
  AND (
    group_id IS NULL  -- Personal challenges
    OR is_group_member(group_id, auth.uid())  -- Group challenges
  )
);

-- Allow participants to add themselves to any challenge they can see
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
    AND (
      c.group_id IS NULL  -- Personal challenges
      OR is_group_member(c.group_id, auth.uid())  -- Group challenges
    )
  )
);

-- Allow users to see challenges they created or are participating in, plus public ones
DROP POLICY IF EXISTS "Members can view challenges" ON public.challenges;

CREATE POLICY "Members can view challenges" 
ON public.challenges 
FOR SELECT 
TO authenticated
USING (
  created_by = auth.uid()  -- Own challenges
  OR group_id IS NULL  -- Personal/public challenges
  OR is_group_member(group_id, auth.uid())  -- Group challenges where user is member
);