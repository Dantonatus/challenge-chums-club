-- Check if user has groups and fix the most critical issues
-- First, check if the user is part of any groups
SELECT auth.uid() as current_user_id;

-- The main issue is that users might not be in any groups
-- Let's create a simple test group and add the user to it for testing
DO $$
DECLARE
    test_group_id uuid;
    current_user_id uuid := auth.uid();
BEGIN
    -- Only create if user has no groups
    IF NOT EXISTS (SELECT 1 FROM group_members WHERE user_id = current_user_id) THEN
        -- Create a test group
        INSERT INTO groups (name, description, owner_id)
        VALUES ('Test Group', 'Temporary test group for debugging', current_user_id)
        RETURNING id INTO test_group_id;
        
        -- Add user to the group
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (test_group_id, current_user_id, 'admin');
        
        RAISE NOTICE 'Created test group % and added user %', test_group_id, current_user_id;
    END IF;
END $$;