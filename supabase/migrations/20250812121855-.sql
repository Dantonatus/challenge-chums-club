-- Ensure private avatars bucket and restrictive RLS policies without using IF NOT EXISTS
-- 1) Create or update the bucket to be private
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = false, name = excluded.name;

-- 2) Policies for storage.objects scoped to user's own folder `${auth.uid()}/...`
-- Insert: allow authenticated users to upload only into their own folder
do $$ begin
  create policy "avatars_insert_own"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
exception when duplicate_object then null; end $$;

-- Select: allow authenticated users to read only their own files
do $$ begin
  create policy "avatars_select_own"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
exception when duplicate_object then null; end $$;

-- Update: allow authenticated users to modify only their own files
do $$ begin
  create policy "avatars_update_own"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
exception when duplicate_object then null; end $$;

-- Delete: allow authenticated users to delete only their own files
do $$ begin
  create policy "avatars_delete_own"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
exception when duplicate_object then null; end $$;