-- Add reminder fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_offset_minutes integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.reminder_enabled IS 'Whether reminders are enabled for this task';
COMMENT ON COLUMN public.tasks.reminder_offset_minutes IS 'Minutes before due time to trigger reminder. NULL means at due time.';