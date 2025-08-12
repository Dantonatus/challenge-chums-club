-- Allow challenge participants to insert violations for other participants in the same challenge
CREATE POLICY IF NOT EXISTS "Participants can insert violations for other participants"
ON public.challenge_violations
FOR INSERT
TO authenticated
WITH CHECK (
  -- actor is a member of the challenge's group
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_violations.challenge_id
      AND public.is_group_member(c.group_id)
  )
  AND
  -- target user is a participant of the challenge
  EXISTS (
    SELECT 1 FROM public.challenge_participants cp_target
    WHERE cp_target.challenge_id = challenge_violations.challenge_id
      AND cp_target.user_id = challenge_violations.user_id
  )
  AND
  -- actor is also a participant of the challenge
  EXISTS (
    SELECT 1 FROM public.challenge_participants cp_actor
    WHERE cp_actor.challenge_id = challenge_violations.challenge_id
      AND cp_actor.user_id = auth.uid()
  )
);
