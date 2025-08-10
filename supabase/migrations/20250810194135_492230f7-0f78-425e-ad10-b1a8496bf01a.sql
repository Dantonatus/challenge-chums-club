-- Fix permissive logs INSERT policy, add utility constraints, and create join_group() RPC
-- 1) Unique constraints / indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON public.group_members (group_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_unique ON public.logs (challenge_id, user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_idea_votes_unique ON public.idea_votes (idea_id, user_id);

-- 2) Fix logs INSERT policy to require membership in the specific challenge
DROP POLICY IF EXISTS "Participants can write their own logs" ON public.logs;
CREATE POLICY "Participants can write their own logs"
ON public.logs
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.challenge_participants cp
    WHERE cp.challenge_id = logs.challenge_id
      AND cp.user_id = auth.uid()
  )
);

-- 3) Create a secure RPC to join a group using invite_code
CREATE OR REPLACE FUNCTION public.join_group(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id FROM public.groups WHERE invite_code = p_invite_code;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO public.group_members (group_id, user_id)
  VALUES (v_group_id, auth.uid())
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_group(text) TO authenticated;