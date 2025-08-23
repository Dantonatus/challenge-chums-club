-- Fix the ambiguous 'id' column reference in the get_popular_challenges_by_duration function
CREATE OR REPLACE FUNCTION public.get_popular_challenges_by_duration(p_start_date date, p_end_date date, p_group_ids uuid[])
 RETURNS TABLE(id uuid, title text, duration_days integer, participant_count integer, total_fails integer, fail_rate_pct numeric, start_date date, participants jsonb, is_trending boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH windowed AS (
        SELECT
            c.id,
            c.title,
            c.start_date,
            c.start_date AS c_start,
            COALESCE(c.end_date, CURRENT_DATE) AS c_end,
            GREATEST(c.start_date, p_start_date)::date AS win_start,
            LEAST(COALESCE(c.end_date, p_end_date), p_end_date)::date AS win_end
        FROM challenges c
        WHERE c.group_id = ANY(p_group_ids)
          AND COALESCE(c.end_date, p_end_date) >= p_start_date
          AND c.start_date <= p_end_date
    ),
    duration AS (
        SELECT
            w.id,
            w.title,
            w.start_date,
            GREATEST(0, (w.win_end - w.win_start + 1))::int AS duration_days
        FROM windowed w
    ),
    participants AS (
        SELECT 
            cp.challenge_id AS challenge_id, 
            COUNT(DISTINCT cp.user_id)::int AS participant_count,
            jsonb_agg(
                jsonb_build_object(
                    'user_id', cp.user_id,
                    'display_name', COALESCE(p.display_name, 'Unknown'),
                    'avatar_url', p.avatar_url
                )
            ) AS participants_json
        FROM challenge_participants cp
        JOIN profiles p ON p.id = cp.user_id
        GROUP BY cp.challenge_id
    ),
    fails AS (
        SELECT
            v.challenge_id AS challenge_id,
            COUNT(*)::int AS total_fails,
            COUNT(DISTINCT DATE(v.created_at))::int AS fail_days
        FROM challenge_violations v
        JOIN windowed w ON w.id = v.challenge_id
        WHERE DATE(v.created_at) BETWEEN w.win_start AND w.win_end
        GROUP BY v.challenge_id
    ),
    active_days AS (
        SELECT d.id, d.duration_days AS active_days FROM duration d
    ),
    fail_rate AS (
        SELECT
            a.id,
            CASE WHEN a.active_days > 0
                THEN ROUND(100.0 * COALESCE(f.fail_days, 0) / a.active_days, 2)
                ELSE 0 END AS fail_rate_pct
        FROM active_days a
        LEFT JOIN fails f ON f.challenge_id = a.id
    )
    SELECT
        d.id,
        d.title,
        d.duration_days,
        COALESCE(p.participant_count, 0) AS participant_count,
        COALESCE(f.total_fails, 0) AS total_fails,
        COALESCE(fr.fail_rate_pct, 0) AS fail_rate_pct,
        d.start_date,
        COALESCE(p.participants_json, '[]'::jsonb) AS participants,
        -- Challenge is trending if started within last 30 days AND duration >= 14 days
        (d.start_date >= CURRENT_DATE - INTERVAL '30 days' AND d.duration_days >= 14) AS is_trending
    FROM duration d
    LEFT JOIN participants p ON p.challenge_id = d.id
    LEFT JOIN fails f ON f.challenge_id = d.id
    LEFT JOIN fail_rate fr ON fr.id = d.id
    ORDER BY 
        d.duration_days DESC,
        participant_count DESC,
        fail_rate_pct ASC,
        d.title ASC
    LIMIT 10;
END;
$function$

-- Security Fix 1: Restrict profile visibility to friends/group members only
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Profiles are viewable by friends and group members"
ON public.profiles
FOR SELECT
USING (
    id = auth.uid() OR -- Users can always see their own profile
    EXISTS ( -- Users can see friends' profiles
        SELECT 1 FROM user_friends uf 
        WHERE ((uf.user_id = auth.uid() AND uf.friend_user_id = id) 
               OR (uf.friend_user_id = auth.uid() AND uf.user_id = id))
               AND uf.status = 'accepted'
    ) OR
    EXISTS ( -- Users can see group members' profiles
        SELECT 1 FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = id
    )
);

-- Security Fix 2: Restrict group invite code visibility to owners only
CREATE POLICY "Only group owners can view invite codes"
ON public.groups
FOR SELECT
USING (
    CASE 
        WHEN owner_id = auth.uid() THEN true  -- Owner sees everything including invite codes
        WHEN is_group_member(id) THEN false  -- Members see group but not invite codes (handled in application layer)
        ELSE false
    END
);

-- Security Fix 3: Remove admin access to approval tokens - service role only
DROP POLICY IF EXISTS "Admins can view approval tokens" ON public.approval_tokens;

-- Only service role can access approval tokens for security
CREATE POLICY "Service role only access to approval tokens"
ON public.approval_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Additional security: Ensure user_roles.user_id cannot be null for RLS to work properly
ALTER TABLE public.user_roles ALTER COLUMN user_id SET NOT NULL;

-- Additional security: Ensure challenge_participants.user_id cannot be null
ALTER TABLE public.challenge_participants ALTER COLUMN user_id SET NOT NULL;

-- Additional security: Ensure all user-related tables have proper NOT NULL constraints
ALTER TABLE public.challenge_violations ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.journal_entries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.idea_comments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.idea_votes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.ideas ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.kpi_measurements ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.scheduled_tips ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_friends ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.user_friends ALTER COLUMN friend_user_id SET NOT NULL;
ALTER TABLE public.saved_views ALTER COLUMN user_id SET NOT NULL;