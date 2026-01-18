-- ============================================================
-- Security Fix: Add authorization checks to SECURITY DEFINER functions
-- ============================================================

-- 1. Fix create_manual_kpi_violation: Add caller authorization check
-- The caller must be either the user themselves, the challenge creator, or group owner
CREATE OR REPLACE FUNCTION public.create_manual_kpi_violation(
    p_challenge_id uuid,
    p_user_id uuid,
    p_amount_cents integer,
    p_violation_date date DEFAULT CURRENT_DATE
)
RETURNS uuid AS $$
DECLARE
    violation_id uuid;
    v_challenge_group_id uuid;
    v_challenge_creator uuid;
BEGIN
    -- SECURITY: Verify caller is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get challenge details for authorization
    SELECT group_id, created_by INTO v_challenge_group_id, v_challenge_creator
    FROM challenges
    WHERE id = p_challenge_id;

    IF v_challenge_group_id IS NULL THEN
        RAISE EXCEPTION 'Challenge not found';
    END IF;

    -- SECURITY: Verify caller has authority to create violations
    -- Allowed: the user being penalized (self-report), challenge creator, or group owner
    IF auth.uid() != p_user_id 
       AND auth.uid() != v_challenge_creator 
       AND NOT public.is_group_owner(v_challenge_group_id, auth.uid()) THEN
        RAISE EXCEPTION 'Not authorized to create violations for this user';
    END IF;

    -- Check if user is participant in challenge
    IF NOT EXISTS (
        SELECT 1 FROM challenge_participants cp
        WHERE cp.challenge_id = p_challenge_id AND cp.user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this challenge';
    END IF;
    
    -- Create violation record
    INSERT INTO challenge_violations (challenge_id, user_id, amount_cents, created_at)
    VALUES (p_challenge_id, p_user_id, p_amount_cents, p_violation_date)
    RETURNING id INTO violation_id;
    
    -- Update penalty count
    UPDATE challenge_participants 
    SET penalty_count = penalty_count + 1
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
    
    RETURN violation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 2. Fix get_popular_challenges_by_duration: Add group membership validation
CREATE OR REPLACE FUNCTION public.get_popular_challenges_by_duration(
    p_start_date date, 
    p_end_date date, 
    p_group_ids uuid[]
)
RETURNS TABLE(
    id uuid, 
    title text, 
    duration_days integer, 
    participant_count integer, 
    total_fails integer, 
    fail_rate_pct numeric, 
    start_date date, 
    participants jsonb, 
    is_trending boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid;
    v_valid_group_ids uuid[];
BEGIN
    -- SECURITY: Verify caller is authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- SECURITY: Filter to only groups the caller is a member of
    SELECT array_agg(gm.group_id) INTO v_valid_group_ids
    FROM group_members gm
    WHERE gm.user_id = v_user_id
      AND gm.group_id = ANY(p_group_ids);

    -- If no valid groups, return empty result
    IF v_valid_group_ids IS NULL OR array_length(v_valid_group_ids, 1) IS NULL THEN
        RETURN;
    END IF;

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
        WHERE c.group_id = ANY(v_valid_group_ids)  -- Use validated group IDs
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
    participants_cte AS (
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
        (d.start_date >= CURRENT_DATE - INTERVAL '30 days' AND d.duration_days >= 14) AS is_trending
    FROM duration d
    LEFT JOIN participants_cte p ON p.challenge_id = d.id
    LEFT JOIN fails f ON f.challenge_id = d.id
    LEFT JOIN fail_rate fr ON fr.id = d.id
    ORDER BY 
        d.duration_days DESC,
        participant_count DESC,
        fail_rate_pct ASC,
        d.title ASC
    LIMIT 10;
END;
$function$;

-- 3. Add comment documenting the security model for detect_kpi_violations trigger function
-- Note: This is a trigger function invoked by PostgreSQL on INSERT to kpi_measurements.
-- It cannot be called directly by users - it's only executed by the database engine.
COMMENT ON FUNCTION public.detect_kpi_violations() IS 
'SECURITY MODEL: This is a TRIGGER function that runs automatically when kpi_measurements 
rows are inserted. It operates on the NEW row data which is already validated by RLS 
policies on kpi_measurements table. The function only creates violations for the user 
who inserted the measurement (NEW.user_id), which is guaranteed by RLS to be auth.uid(). 
Direct invocation is prevented by PostgreSQL - trigger functions can only be called 
via EXECUTE FUNCTION in CREATE TRIGGER statements.';