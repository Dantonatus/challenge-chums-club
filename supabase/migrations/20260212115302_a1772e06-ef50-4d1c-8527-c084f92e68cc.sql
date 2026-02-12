
DROP FUNCTION IF EXISTS public.get_popular_challenges_by_duration(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_popular_challenges_by_duration(p_group_id UUID, p_start_date TEXT, p_end_date TEXT)
RETURNS TABLE(id UUID, challenge_id UUID, title TEXT, participant_count BIGINT, participants TEXT[], duration_days INTEGER, total_fails BIGINT, is_trending BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.id,
    c.title,
    COUNT(DISTINCT cp.user_id),
    ARRAY_AGG(DISTINCT cp.user_id::text),
    (c.end_date::date - c.start_date::date),
    COALESCE(SUM(cp.penalty_count), 0)::bigint,
    false
  FROM public.challenges c
  LEFT JOIN public.challenge_participants cp ON cp.challenge_id = c.id
  WHERE c.group_id = p_group_id
    AND c.start_date >= p_start_date AND c.end_date <= p_end_date
  GROUP BY c.id, c.title, c.start_date, c.end_date
  ORDER BY participant_count DESC;
END;
$$;
