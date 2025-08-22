-- Update RLS policies for challenge_violations to allow admin access

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Participants can insert violations" ON public.challenge_violations;
DROP POLICY IF EXISTS "Participants can report violations for challenge members" ON public.challenge_violations;
DROP POLICY IF EXISTS "Participants or owner/creator can update violations" ON public.challenge_violations;

-- Create new policies that include admin permissions

-- Allow admins OR participants to insert violations
CREATE POLICY "Admins or participants can insert violations" ON public.challenge_violations
FOR INSERT
WITH CHECK (
  -- Admin users can insert violations for any challenge
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Participants can insert violations for challenges they're in
  (EXISTS (
    SELECT 1 FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_violations.challenge_id 
    AND cp.user_id = auth.uid()
  ))
);

-- Allow admins OR participants to report violations for challenge members
CREATE POLICY "Admins or participants can report violations for challenge members" ON public.challenge_violations
FOR INSERT  
WITH CHECK (
  -- Admin users can report violations for any challenge
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Participants can report violations for other participants in the same challenge
  (EXISTS (
    SELECT 1 FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_violations.challenge_id 
    AND cp.user_id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM challenge_participants cp2
    WHERE cp2.challenge_id = challenge_violations.challenge_id 
    AND cp2.user_id = challenge_violations.user_id
  ))
);

-- Allow admins OR participants/owners to update violations
CREATE POLICY "Admins or authorized users can update violations" ON public.challenge_violations
FOR UPDATE
USING (
  -- Admin users can update any violation
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Challenge owner/creator can update violations
  (EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_violations.challenge_id 
    AND (is_group_owner(c.group_id) OR c.created_by = auth.uid())
  ))
  OR
  -- Participants can update violations in their challenges
  (EXISTS (
    SELECT 1 FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_violations.challenge_id 
    AND cp.user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Same conditions for the updated row
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  (EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_violations.challenge_id 
    AND (is_group_owner(c.group_id) OR c.created_by = auth.uid())
  ))
  OR
  (EXISTS (
    SELECT 1 FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_violations.challenge_id 
    AND cp.user_id = auth.uid()
  ))
);

-- Allow admins OR owners/creators to delete violations  
CREATE POLICY "Admins or authorized users can delete violations" ON public.challenge_violations
FOR DELETE
USING (
  -- Admin users can delete any violation
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Challenge owner/creator can delete violations
  (EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_violations.challenge_id 
    AND (is_group_owner(c.group_id) OR c.created_by = auth.uid())
  ))
);