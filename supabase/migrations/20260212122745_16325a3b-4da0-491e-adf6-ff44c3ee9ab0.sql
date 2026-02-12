GRANT ALL ON public.gantt_tasks TO anon, authenticated;
GRANT ALL ON public.planning_projects TO anon, authenticated;
NOTIFY pgrst, 'reload schema';