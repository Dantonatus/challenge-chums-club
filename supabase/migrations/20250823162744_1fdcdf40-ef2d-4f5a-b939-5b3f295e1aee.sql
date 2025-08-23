-- Security Fix: Restrict approval_tokens access and add proper validation

-- Remove overly permissive policy that allows ALL operations for service_role
DROP POLICY IF EXISTS "Service role can manage approval tokens" ON public.approval_tokens;

-- Remove redundant policies and replace with more secure ones
DROP POLICY IF EXISTS "Edge function validation only" ON public.approval_tokens;
DROP POLICY IF EXISTS "Token creation for signup" ON public.approval_tokens;
DROP POLICY IF EXISTS "Token usage tracking" ON public.approval_tokens;

-- Create secure policies with proper validation

-- Policy 1: Only allow SELECT for token validation in edge functions with additional security
CREATE POLICY "Secure token validation for edge functions"
ON public.approval_tokens
FOR SELECT
USING (
    auth.jwt() ->> 'role' = 'service_role' AND
    current_setting('application_name', true) LIKE '%edge-runtime%' AND
    expires_at > now() AND  -- Only allow access to non-expired tokens
    used_at IS NULL  -- Only allow access to unused tokens
);

-- Policy 2: Allow INSERT only for token creation during signup process
CREATE POLICY "Secure token creation for signup"
ON public.approval_tokens  
FOR INSERT
WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' AND
    current_setting('application_name', true) LIKE '%edge-runtime%' AND
    expires_at > now() AND  -- Ensure tokens are created with valid expiration
    used_at IS NULL  -- Ensure tokens are created as unused
);

-- Policy 3: Allow UPDATE only for marking tokens as used (one-time use)
CREATE POLICY "Secure token usage marking"
ON public.approval_tokens
FOR UPDATE
USING (
    auth.jwt() ->> 'role' = 'service_role' AND
    current_setting('application_name', true) LIKE '%edge-runtime%' AND
    used_at IS NULL AND  -- Can only update unused tokens
    expires_at > now()   -- Can only update non-expired tokens
)
WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' AND
    used_at IS NOT NULL  -- Can only set used_at to a value (mark as used)
);

-- Policy 4: Prevent any DELETE operations on approval tokens for audit trail
-- No DELETE policy = no one can delete approval tokens

-- Add a function to clean up expired tokens (called by scheduled job, not exposed to app)
CREATE OR REPLACE FUNCTION public.cleanup_expired_approval_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Only allow this function to be called by supabase_admin
    IF current_user != 'supabase_admin' THEN
        RAISE EXCEPTION 'Access denied: Only admin can cleanup expired tokens';
    END IF;
    
    -- Delete tokens expired for more than 24 hours (grace period)
    DELETE FROM public.approval_tokens 
    WHERE expires_at < now() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;