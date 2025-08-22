-- Drop existing policy if it exists and create new one for updating violations
DROP POLICY IF EXISTS "Participants or owner/creator can update violations" ON public.challenge_violations;

CREATE POLICY "Participants or owner/creator can update violations"
ON public.challenge_violations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_violations.challenge_id
      AND (public.is_group_owner(c.group_id) OR c.created_by = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.challenge_participants cp
    WHERE cp.challenge_id = challenge_violations.challenge_id
      AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_violations.challenge_id
      AND (public.is_group_owner(c.group_id) OR c.created_by = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.challenge_participants cp
    WHERE cp.challenge_id = challenge_violations.challenge_id
      AND cp.user_id = auth.uid()
  )
);