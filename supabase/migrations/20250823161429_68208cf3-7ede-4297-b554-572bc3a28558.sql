-- Critical Security Fix: Tighten approval_tokens policy to service functions only
DROP POLICY IF EXISTS "Service role only access to approval tokens" ON public.approval_tokens;

-- More restrictive policy - only specific service functions should access tokens
CREATE POLICY "Restricted service access to approval tokens"
ON public.approval_tokens
FOR ALL
USING (
    auth.jwt() ->> 'role' = 'service_role' AND 
    current_setting('request.method', true) IN ('DELETE', 'UPDATE') -- Only for cleanup operations
)
WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' AND
    current_setting('request.method', true) = 'INSERT' -- Only for token creation
);

-- Security Fix: Restrict payment data visibility to user and group owner only
DROP POLICY IF EXISTS "Members can view payments in group" ON public.payments;

CREATE POLICY "Users and group owners can view payments"
ON public.payments
FOR SELECT
USING (
    user_id = auth.uid() OR -- Users can see their own payments
    is_group_owner(group_id) -- Group owners can see all payments in their groups
);

-- Security Fix: Ensure journal entries remain strictly private
DROP POLICY IF EXISTS "Users can view their own journal" ON public.journal_entries;

CREATE POLICY "Users can view only their own private journal"
ON public.journal_entries
FOR SELECT
USING (user_id = auth.uid()); -- Only the user can see their own journal entries

-- Remove group_id from journal entries to ensure privacy
-- Note: This is a destructive change but necessary for security
ALTER TABLE public.journal_entries DROP COLUMN IF EXISTS group_id;