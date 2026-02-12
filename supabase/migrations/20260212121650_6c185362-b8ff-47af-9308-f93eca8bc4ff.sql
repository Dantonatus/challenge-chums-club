GRANT SELECT, INSERT, UPDATE, DELETE ON public.gantt_tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_projects TO anon, authenticated;
NOTIFY pgrst, 'reload schema';