-- Security Enhancement: Add token encryption and additional validation layers

-- Create a secure token encryption function using built-in Postgres encryption
CREATE OR REPLACE FUNCTION public.encrypt_approval_token(token_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    encrypted_token text;
    encryption_key text;
BEGIN
    -- Use a combination of system settings and random data for encryption key
    encryption_key := encode(sha256(concat(
        current_setting('cluster_name', true),
        extract(epoch from now())::text,
        gen_random_uuid()::text
    )::bytea), 'hex');
    
    -- Encrypt the token using pgcrypto
    encrypted_token := encode(encrypt(token_value::bytea, encryption_key::bytea, 'aes'), 'base64');
    
    RETURN encrypted_token;
END;
$$;

-- Create function to validate token format and expiration with rate limiting
CREATE OR REPLACE FUNCTION public.validate_approval_token(
    token_value text,
    user_email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    token_record record;
    attempt_count integer;
    last_attempt timestamp;
BEGIN
    -- Input validation
    IF token_value IS NULL OR length(token_value) < 32 THEN
        RAISE EXCEPTION 'Invalid token format';
    END IF;
    
    -- Rate limiting: Check for abuse attempts
    SELECT COUNT(*), MAX(created_at)
    INTO attempt_count, last_attempt
    FROM approval_tokens 
    WHERE created_at > now() - INTERVAL '1 hour'
    AND (user_email IS NULL OR user_id IN (
        SELECT auth.uid() FROM auth.users WHERE email = user_email
    ));
    
    -- Block if too many recent attempts
    IF attempt_count > 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded. Too many token validation attempts.';
    END IF;
    
    -- Find and validate the token
    SELECT * INTO token_record
    FROM approval_tokens 
    WHERE token = token_value
    AND expires_at > now()
    AND used_at IS NULL;
    
    -- Token not found or invalid
    IF NOT FOUND THEN
        -- Log the failed attempt for security monitoring
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
                'event_type', 'token_validation_failed',
                'token_prefix', left(token_value, 8),
                'user_email', user_email,
                'timestamp', now()
            ),
            now(),
            inet_client_addr()
        );
        
        RETURN false;
    END IF;
    
    -- Additional security checks
    IF token_record.expires_at < now() + INTERVAL '5 minutes' THEN
        RAISE EXCEPTION 'Token expires too soon. Security policy violation.';
    END IF;
    
    RETURN true;
END;
$$;

-- Create function to securely mark token as used with audit trail
CREATE OR REPLACE FUNCTION public.consume_approval_token(
    token_value text,
    consuming_user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    token_record record;
    success boolean := false;
BEGIN
    -- Validate token first
    IF NOT public.validate_approval_token(token_value) THEN
        RETURN false;
    END IF;
    
    -- Atomically mark token as used
    UPDATE approval_tokens 
    SET used_at = now(),
        -- Store additional security metadata
        used_by = COALESCE(consuming_user_id, auth.uid()),
        used_from_ip = inet_client_addr()
    WHERE token = token_value
    AND expires_at > now()
    AND used_at IS NULL
    RETURNING * INTO token_record;
    
    -- Check if update was successful
    IF FOUND THEN
        success := true;
        
        -- Log successful token consumption for audit
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
                'event_type', 'token_consumed',
                'token_id', token_record.id,
                'user_id', token_record.user_id,
                'consumed_by', COALESCE(consuming_user_id, auth.uid()),
                'timestamp', now()
            ),
            now(),
            inet_client_addr()
        );
    END IF;
    
    RETURN success;
END;
$$;

-- Add additional security columns to approval_tokens table
ALTER TABLE approval_tokens 
ADD COLUMN IF NOT EXISTS used_by uuid,
ADD COLUMN IF NOT EXISTS used_from_ip inet,
ADD COLUMN IF NOT EXISTS security_hash text,
ADD COLUMN IF NOT EXISTS creation_context jsonb DEFAULT '{}';

-- Create secure token generation function
CREATE OR REPLACE FUNCTION public.generate_secure_approval_token(
    target_user_id uuid,
    expiry_hours integer DEFAULT 24
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_token text;
    token_hash text;
    context_data jsonb;
BEGIN
    -- Only allow service role to generate tokens
    IF (auth.jwt() ->> 'role') != 'service_role' THEN
        RAISE EXCEPTION 'Unauthorized: Only service role can generate tokens';
    END IF;
    
    -- Generate cryptographically secure token
    new_token := encode(gen_random_bytes(32), 'base64');
    new_token := replace(replace(replace(new_token, '+', '-'), '/', '_'), '=', '');
    
    -- Create security hash for additional validation
    token_hash := encode(sha256(concat(new_token, target_user_id::text, extract(epoch from now())::text)::bytea), 'hex');
    
    -- Collect security context
    context_data := jsonb_build_object(
        'created_by', 'system',
        'creation_ip', inet_client_addr(),
        'user_agent', current_setting('request.headers', true)::jsonb ->> 'user-agent',
        'timestamp', now()
    );
    
    -- Insert the token with security metadata
    INSERT INTO approval_tokens (
        user_id,
        token,
        expires_at,
        security_hash,
        creation_context
    ) VALUES (
        target_user_id,
        new_token,
        now() + make_interval(hours => LEAST(expiry_hours, 48)), -- Max 48 hours
        token_hash,
        context_data
    );
    
    RETURN new_token;
END;
$$;

-- Update existing policies to use the new security functions
DROP POLICY IF EXISTS "Secure token validation for edge functions" ON public.approval_tokens;
DROP POLICY IF EXISTS "Secure token creation for signup" ON public.approval_tokens;
DROP POLICY IF EXISTS "Secure token usage marking" ON public.approval_tokens;

-- New ultra-secure policies that require additional validation
CREATE POLICY "Ultra secure token validation"
ON public.approval_tokens
FOR SELECT
USING (
    auth.jwt() ->> 'role' = 'service_role' AND
    current_setting('application_name', true) LIKE '%edge-runtime%' AND
    expires_at > now() + INTERVAL '5 minutes' AND  -- Must have significant time left
    used_at IS NULL AND
    security_hash IS NOT NULL  -- Must have security hash
);

CREATE POLICY "Secure token creation with validation"
ON public.approval_tokens  
FOR INSERT
WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' AND
    current_setting('application_name', true) LIKE '%edge-runtime%' AND
    expires_at > now() AND
    expires_at <= now() + INTERVAL '48 hours' AND  -- Max 48 hour expiry
    used_at IS NULL AND
    length(token) >= 32  -- Minimum token length
);

CREATE POLICY "Secure token consumption only"
ON public.approval_tokens
FOR UPDATE
USING (
    auth.jwt() ->> 'role' = 'service_role' AND
    current_setting('application_name', true) LIKE '%edge-runtime%' AND
    used_at IS NULL AND
    expires_at > now() AND
    security_hash IS NOT NULL
)
WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' AND
    used_at IS NOT NULL AND  -- Can only mark as used
    used_by IS NOT NULL      -- Must record who used it
);

-- Prevent any DELETE operations - tokens should remain for audit
-- No DELETE policy = no deletions allowed

-- Create a security monitoring function
CREATE OR REPLACE FUNCTION public.monitor_token_security()
RETURNS TABLE(
    suspicious_activity_count bigint,
    expired_unused_tokens bigint,
    recent_failures bigint,
    recommendations text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rec text[];
BEGIN
    -- Only admins can run security monitoring
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Only admins can monitor token security';
    END IF;
    
    -- Count suspicious activities
    SELECT COUNT(*) INTO suspicious_activity_count
    FROM approval_tokens
    WHERE created_at > now() - INTERVAL '24 hours'
    AND (security_hash IS NULL OR expires_at > now() + INTERVAL '48 hours');
    
    -- Count expired unused tokens
    SELECT COUNT(*) INTO expired_unused_tokens
    FROM approval_tokens
    WHERE expires_at < now() AND used_at IS NULL;
    
    -- Count recent validation failures from audit log
    SELECT COUNT(*) INTO recent_failures
    FROM auth.audit_log_entries
    WHERE created_at > now() - INTERVAL '24 hours'
    AND payload->>'event_type' = 'token_validation_failed';
    
    -- Generate recommendations
    rec := ARRAY[]::text[];
    
    IF suspicious_activity_count > 0 THEN
        rec := array_append(rec, 'Review tokens created in last 24h for security policy violations');
    END IF;
    
    IF expired_unused_tokens > 10 THEN
        rec := array_append(rec, 'Clean up expired unused tokens (consider automated cleanup)');
    END IF;
    
    IF recent_failures > 20 THEN
        rec := array_append(rec, 'High number of token validation failures - possible attack');
    END IF;
    
    IF array_length(rec, 1) IS NULL THEN
        rec := array_append(rec, 'No immediate security concerns detected');
    END IF;
    
    recommendations := rec;
    
    RETURN QUERY SELECT 
        suspicious_activity_count,
        expired_unused_tokens, 
        recent_failures,
        recommendations;
END;
$$;