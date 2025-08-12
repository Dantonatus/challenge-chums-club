-- Allow participants to insert their own violations (self-reported)
CREATE POLICY IF NOT EXISTS "Participants can insert own violations"
ON public.challenge_violations
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_violations.challenge_id
      AND public.is_group_member(c.group_id)
  )
);

-- Keep existing owner/creator insert policy as-is; this complements it.
