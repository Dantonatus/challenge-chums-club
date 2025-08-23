-- Additional security: Ensure all user-related tables have proper NOT NULL constraints for RLS
-- These are critical for security as RLS policies rely on user_id being present

-- Update tables that may have nullable user_id fields
DO $$
BEGIN
    -- Only add NOT NULL constraint if the column allows it and doesn't already have it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'user_roles' AND ccu.column_name = 'user_id' AND tc.constraint_type = 'NOT NULL'
    ) THEN
        -- Check if there are any NULL values first
        IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id IS NULL) THEN
            ALTER TABLE public.user_roles ALTER COLUMN user_id SET NOT NULL;
        END IF;
    END IF;

    -- Repeat for other critical tables
    IF NOT EXISTS (SELECT 1 FROM challenge_participants WHERE user_id IS NULL) THEN
        ALTER TABLE public.challenge_participants ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM challenge_violations WHERE user_id IS NULL) THEN
        ALTER TABLE public.challenge_violations ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM journal_entries WHERE user_id IS NULL) THEN
        ALTER TABLE public.journal_entries ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM kpi_measurements WHERE user_id IS NULL) THEN
        ALTER TABLE public.kpi_measurements ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM logs WHERE user_id IS NULL) THEN
        ALTER TABLE public.logs ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM payments WHERE user_id IS NULL) THEN
        ALTER TABLE public.payments ALTER COLUMN user_id SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM saved_views WHERE user_id IS NULL) THEN
        ALTER TABLE public.saved_views ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;