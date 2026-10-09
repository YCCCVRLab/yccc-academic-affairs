create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.aa_is_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.aa_profiles p where p.user_id = auth.uid() and p.role = 'admin');
$$;
create or replace function private.aa_is_editor()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.aa_profiles p where p.user_id = auth.uid() and p.role in ('editor','admin'));
$$;
create or replace function private.aa_can_access_resource(resource_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.aa_resources r
    where r.id = resource_id and r.published = true and (
      r.visibility = 'public'
      or (auth.uid() is not null and r.visibility = 'signed_in')
      or (auth.uid() is not null and r.visibility = 'restricted' and (
        exists (select 1 from public.aa_profiles p join public.aa_resource_email_rules e on lower(e.email)=lower(p.email) where p.user_id=auth.uid() and e.resource_id=r.id)
        or exists (select 1 from public.aa_group_members gm join public.aa_resource_group_rules gr on gr.group_id=gm.group_id where gm.user_id=auth.uid() and gr.resource_id=r.id)
      ))
    )
  );
$$;
revoke all on function private.aa_is_admin() from public, anon;
revoke all on function private.aa_is_editor() from public, anon;
revoke all on function private.aa_can_access_resource(uuid) from public;
grant execute on function private.aa_is_admin() to authenticated;
grant execute on function private.aa_is_editor() to authenticated;
grant execute on function private.aa_can_access_resource(uuid) to anon, authenticated;

drop policy if exists "profile read self or admin" on public.aa_profiles;
create policy "profile read self or admin" on public.aa_profiles for select to authenticated using (user_id=auth.uid() or private.aa_is_admin());
drop policy if exists "profile update self nonadmin" on public.aa_profiles;
create policy "profile update self nonadmin" on public.aa_profiles for update to authenticated
using (user_id=auth.uid() and not private.aa_is_admin())
with check (user_id=auth.uid() and role=(select p.role from public.aa_profiles p where p.user_id=auth.uid()));
drop policy if exists "admin manage profiles" on public.aa_profiles;
create policy "admin manage profiles" on public.aa_profiles for all to authenticated using (private.aa_is_admin()) with check (private.aa_is_admin());

drop policy if exists "groups readable by signed in" on public.aa_groups;
create policy "groups readable by signed in" on public.aa_groups for select to authenticated using (true);
drop policy if exists "admin manage groups" on public.aa_groups;
create policy "admin manage groups" on public.aa_groups for all to authenticated using (private.aa_is_admin()) with check (private.aa_is_admin());

drop policy if exists "members self or admin" on public.aa_group_members;
create policy "members self or admin" on public.aa_group_members for select to authenticated using (user_id=auth.uid() or private.aa_is_admin());
drop policy if exists "admin manage members" on public.aa_group_members;
create policy "admin manage members" on public.aa_group_members for all to authenticated using (private.aa_is_admin()) with check (private.aa_is_admin());

drop policy if exists "published resources readable if permitted" on public.aa_resources;
create policy "published resources readable if permitted" on public.aa_resources for select to anon, authenticated
using (private.aa_can_access_resource(id) or (auth.uid() is not null and private.aa_is_editor()));
drop policy if exists "editors manage resources" on public.aa_resources;
create policy "editors manage resources" on public.aa_resources for all to authenticated using (private.aa_is_editor()) with check (private.aa_is_editor());

drop policy if exists "resource email rules admin only" on public.aa_resource_email_rules;
create policy "resource email rules admin only" on public.aa_resource_email_rules for all to authenticated using (private.aa_is_admin()) with check (private.aa_is_admin());
drop policy if exists "resource group rules admin only" on public.aa_resource_group_rules;
create policy "resource group rules admin only" on public.aa_resource_group_rules for all to authenticated using (private.aa_is_admin()) with check (private.aa_is_admin());

drop policy if exists "audit admin only" on public.aa_audit_log;
create policy "audit admin only" on public.aa_audit_log for select to authenticated using (private.aa_is_admin());

drop function if exists public.aa_is_admin();
drop function if exists public.aa_is_editor();
drop function if exists public.aa_can_access_resource(uuid);

create or replace function private.aa_create_profile_for_verified_college_signup()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is not null and lower(new.email) ~ '^[^[:space:]@]+@mainecc[.]edu$' then
    insert into public.aa_profiles(user_id,email,display_name,role)
    values(new.id,lower(new.email),nullif(trim(new.raw_user_meta_data->>'full_name'),''),'viewer')
    on conflict(user_id) do update set email=excluded.email,updated_at=now();
  else
    delete from public.aa_profiles where user_id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.aa_create_profile_for_verified_college_signup() from public, anon, authenticated;
drop trigger if exists aa_on_auth_user_created on auth.users;
create trigger aa_on_auth_user_created after insert on auth.users for each row
execute function private.aa_create_profile_for_verified_college_signup();
