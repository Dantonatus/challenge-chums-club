-- Update the RLS policy for challenge_violations to allow participants to add violations
-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Owner or creator can insert violations" ON public.challenge_violations;

-- Create a new policy that allows challenge participants to insert violations
CREATE POLICY "Participants can insert violations" 
ON public.challenge_violations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_violations.challenge_id 
      AND cp.user_id = auth.uid()
  )
);

-- Also add a policy to allow participants to insert violations for any participant in their challenge
-- (this allows mutual accountability - participants can report violations they observe)
CREATE POLICY "Participants can report violations for challenge members" 
ON public.challenge_violations 
FOR INSERT 
WITH CHECK (
  -- The inserting user must be a participant in the challenge
  EXISTS (
    SELECT 1
    FROM challenge_participants cp
    WHERE cp.challenge_id = challenge_violations.challenge_id 
      AND cp.user_id = auth.uid()
  )
  AND
  -- The violation target must also be a participant in the same challenge
  EXISTS (
    SELECT 1
    FROM challenge_participants cp2
    WHERE cp2.challenge_id = challenge_violations.challenge_id 
      AND cp2.user_id = challenge_violations.user_id
  )
);