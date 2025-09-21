-- Enhanced RLS policy for profile privacy
DROP POLICY IF EXISTS "Profiles are viewable by friends and group members" ON public.profiles;
DROP POLICY IF EXISTS "Enhanced profile privacy with user preferences" ON public.profiles;

CREATE POLICY "Enhanced profile privacy with user preferences" 
ON public.profiles 
FOR SELECT 
USING (
  -- User can always see their own profile
  id = auth.uid() OR
  -- Check privacy settings for others
  CASE 
    WHEN (privacy_settings->>'profile_visibility') = 'public' THEN true
    WHEN (privacy_settings->>'profile_visibility') = 'friends_and_groups' THEN (
      -- Friends with accepted status
      EXISTS (
        SELECT 1 FROM user_friends uf 
        WHERE (
          (uf.user_id = auth.uid() AND uf.friend_user_id = profiles.id) OR 
          (uf.friend_user_id = auth.uid() AND uf.user_id = profiles.id)
        ) AND uf.status = 'accepted'
      ) OR
      -- Group members
      EXISTS (
        SELECT 1 FROM group_members gm1 
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id 
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
      )
    )
    WHEN (privacy_settings->>'profile_visibility') = 'groups_only' THEN (
      EXISTS (
        SELECT 1 FROM group_members gm1 
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id 
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = profiles.id
      )
    )
    WHEN (privacy_settings->>'profile_visibility') = 'private' THEN false
    ELSE false
  END
);

-- Enhanced friend request privacy
DROP POLICY IF EXISTS "Users can view own friendships" ON public.user_friends;
DROP POLICY IF EXISTS "Enhanced friendship privacy" ON public.user_friends;

CREATE POLICY "Enhanced friendship privacy" 
ON public.user_friends 
FOR SELECT 
USING (
  -- Users can see their own friendships
  (user_id = auth.uid() OR friend_user_id = auth.uid()) OR
  -- Others can only see accepted friendships, not pending requests
  (status = 'accepted' AND (
    EXISTS (
      SELECT 1 FROM profiles p1 
      WHERE p1.id = user_friends.user_id 
      AND (p1.privacy_settings->>'profile_visibility') IN ('public', 'friends_and_groups')
    ) AND
    EXISTS (
      SELECT 1 FROM profiles p2 
      WHERE p2.id = user_friends.friend_user_id 
      AND (p2.privacy_settings->>'profile_visibility') IN ('public', 'friends_and_groups')
    )
  ))
);

-- Create security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id_param uuid DEFAULT auth.uid(),
  metadata_param jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO auth.audit_log_entries (
    instance_id,
    id,
    payload,
    created_at,
    ip_address
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    jsonb_build_object(
      'event_type', event_type,
      'user_id', user_id_param,
      'metadata', metadata_param,
      'timestamp', now(),
      'user_agent', current_setting('request.headers', true)::jsonb ->> 'user-agent'
    ),
    now(),
    inet_client_addr()
  );
END;
$$;

-- Enhanced token cleanup with security monitoring
CREATE OR REPLACE FUNCTION public.cleanup_expired_approval_tokens_enhanced()
RETURNS TABLE(deleted_count integer, suspicious_tokens integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count_var integer;
    suspicious_count_var integer;
BEGIN
    -- Only allow service_role or admins
    IF (auth.jwt() ->> 'role') != 'service_role' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Only service role or admin can cleanup tokens';
    END IF;
    
    -- Count suspicious tokens (unused, recently created, short expiry)
    SELECT COUNT(*) INTO suspicious_count_var
    FROM approval_tokens 
    WHERE used_at IS NULL 
    AND created_at > now() - INTERVAL '1 hour'
    AND expires_at < now() + INTERVAL '2 hours';
    
    -- Log cleanup activity
    PERFORM log_security_event(
        'token_cleanup',
        null,
        jsonb_build_object(
            'suspicious_tokens_found', suspicious_count_var,
            'cleanup_time', now()
        )
    );
    
    -- Delete expired tokens
    DELETE FROM approval_tokens 
    WHERE expires_at < now() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count_var = ROW_COUNT;
    
    RETURN QUERY SELECT deleted_count_var, suspicious_count_var;
END;
$$;

-- Function to detect failed authentication patterns
CREATE OR REPLACE FUNCTION public.monitor_failed_auth_attempts()
RETURNS TABLE(user_email text, attempt_count bigint, last_attempt timestamp with time zone, is_suspicious boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow admins to run this monitoring
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Only admins can monitor authentication';
    END IF;
    
    RETURN QUERY
    WITH failed_attempts AS (
        SELECT 
            payload->>'email' as email,
            COUNT(*) as attempts,
            MAX(created_at) as latest
        FROM auth.audit_log_entries
        WHERE created_at > now() - INTERVAL '24 hours'
        AND payload->>'event_type' LIKE '%failed%'
        AND payload->>'email' IS NOT NULL
        GROUP BY payload->>'email'
    )
    SELECT 
        fa.email::text,
        fa.attempts,
        fa.latest,
        (fa.attempts > 10)::boolean as suspicious
    FROM failed_attempts fa
    ORDER BY fa.attempts DESC, fa.latest DESC;
END;
$$;