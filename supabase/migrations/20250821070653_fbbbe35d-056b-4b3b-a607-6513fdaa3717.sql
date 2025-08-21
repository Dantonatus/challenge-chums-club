
-- 1) Bestehende Trigger ggf. sauber entfernen, dann neu anlegen
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_profiles') then
    drop trigger on_auth_user_created_profiles on auth.users;
  end if;
  if exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_roles') then
    drop trigger on_auth_user_created_roles on auth.users;
  end if;
end
$$;

-- Profile-Trigger
create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Rollen-Trigger
create trigger on_auth_user_created_roles
  after insert on auth.users
  for each row execute procedure public.handle_new_user_registration();

-- 2) approve_user so anpassen, dass auch service_role (E-Mail-Link über Edge Function) genehmigen darf
create or replace function public.approve_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  jwt_role text := coalesce((auth.jwt() ->> 'role')::text, '');
  approver uuid := auth.uid();
begin
  -- Erlaubt: Admin-User ODER der Edge Function-Aufruf mit service_role
  if (jwt_role <> 'service_role') and (not public.has_role(approver, 'admin')) then
    raise exception 'Only admins can approve users';
  end if;

  -- User von pending -> user setzen
  update public.user_roles 
     set role = 'user',
         approved_at = now(),
         approved_by = coalesce(approver, approved_by)
   where user_id = target_user_id
     and role = 'pending';

  -- Profile-Flag setzen
  update public.profiles 
     set is_approved = true
   where id = target_user_id;

  return found;
end;
$function$;

-- 3) Backfill: Profile und Rollen für bereits existierende Benutzer
insert into public.profiles (id, display_name, avatar_url)
select u.id, split_part(u.email, '@', 1), null
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.user_roles (user_id, role)
select u.id, 'pending'::app_role
from auth.users u
left join public.user_roles r on r.user_id = u.id
where r.user_id is null;

-- Falls noch kein Admin existiert, mache den angegebenen Benutzer zum Admin
do $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    update public.user_roles
       set role = 'admin', approved_at = now(), approved_by = user_id
     where user_id = (select id from auth.users where email = 'danielantonatus@live.de' limit 1);
  end if;
end
$$;

-- Profile-Flag is_approved konsistent zu den Rollen setzen
update public.profiles p
   set is_approved = r.role in ('admin','user')
  from public.user_roles r
 where r.user_id = p.id;
