-- Security Fix 2: Remove admin access to approval tokens - service role only
DROP POLICY IF EXISTS "Admins can view approval tokens" ON public.approval_tokens;

-- Only service role can access approval tokens for security
CREATE POLICY "Service role only access to approval tokens"
ON public.approval_tokens
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');