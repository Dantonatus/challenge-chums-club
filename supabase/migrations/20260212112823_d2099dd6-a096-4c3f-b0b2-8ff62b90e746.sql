
-- user_friends
CREATE TABLE public.user_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_user_id)
);
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own friends" ON public.user_friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_user_id);
CREATE POLICY "Users can create friend requests" ON public.user_friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update friend status" ON public.user_friends FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_user_id);
CREATE POLICY "Users can delete friends" ON public.user_friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- task_audit_log
CREATE TABLE public.task_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own audit logs" ON public.task_audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create audit logs" ON public.task_audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix shopping_list_items: add missing columns
ALTER TABLE public.shopping_list_items ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE public.shopping_list_items ADD COLUMN IF NOT EXISTS amount TEXT;
ALTER TABLE public.shopping_list_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.shopping_list_items ADD COLUMN IF NOT EXISTS checked BOOLEAN DEFAULT false;

-- RPC: get_server_time
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;

-- RPC: get_group_invite_code
CREATE OR REPLACE FUNCTION public.get_group_invite_code(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT invite_code INTO v_code FROM public.groups WHERE id = p_group_id AND owner_id = auth.uid();
  RETURN v_code;
END;
$$;

-- RPC: get_popular_challenges_by_duration
CREATE OR REPLACE FUNCTION public.get_popular_challenges_by_duration(p_group_id UUID, p_start_date TEXT, p_end_date TEXT)
RETURNS TABLE(challenge_id UUID, title TEXT, participant_count BIGINT, duration_days INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as challenge_id,
    c.title,
    COUNT(DISTINCT cp.user_id) as participant_count,
    (c.end_date::date - c.start_date::date) as duration_days
  FROM public.challenges c
  LEFT JOIN public.challenge_participants cp ON cp.challenge_id = c.id
  WHERE c.group_id = p_group_id
    AND c.start_date >= p_start_date
    AND c.end_date <= p_end_date
  GROUP BY c.id, c.title, c.start_date, c.end_date
  ORDER BY participant_count DESC;
END;
$$;
