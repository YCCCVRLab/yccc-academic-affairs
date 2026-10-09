create or replace function private.aa_is_verified_college_user()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email) ~ '^[^[:space:]@]+@mainecc[.]edu$');
$$;
revoke all on function private.aa_is_verified_college_user() from public;
grant execute on function private.aa_is_verified_college_user() to anon, authenticated;

create or replace function private.aa_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.aa_is_verified_college_user() and exists(select 1 from public.aa_profiles p where p.user_id=auth.uid() and p.role='admin'); $$;
create or replace function private.aa_is_editor()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.aa_is_verified_college_user() and exists(select 1 from public.aa_profiles p where p.user_id=auth.uid() and p.role in ('editor','admin')); $$;
create or replace function private.aa_can_access_resource(resource_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.aa_resources r where r.id=resource_id and r.published=true and (
    r.visibility='public' or (private.aa_is_verified_college_user() and (
      r.visibility='signed_in' or (r.visibility='restricted' and (
        exists(select 1 from public.aa_profiles p join public.aa_resource_email_rules e on lower(e.email)=lower(p.email) where p.user_id=auth.uid() and e.resource_id=r.id)
        or exists(select 1 from public.aa_group_members gm join public.aa_resource_group_rules gr on gr.group_id=gm.group_id where gm.user_id=auth.uid() and gr.resource_id=r.id)
      ))
    ))
  ));
$$;

drop policy if exists "profile read self or admin" on public.aa_profiles;
create policy "profile read self or admin" on public.aa_profiles for select to authenticated using(private.aa_is_verified_college_user() and (user_id=auth.uid() or private.aa_is_admin()));
drop policy if exists "profile update self nonadmin" on public.aa_profiles;
create policy "profile update self nonadmin" on public.aa_profiles for update to authenticated
using(private.aa_is_verified_college_user() and user_id=auth.uid() and not private.aa_is_admin())
with check(private.aa_is_verified_college_user() and user_id=auth.uid()
and role=(select p.role from public.aa_profiles p where p.user_id=auth.uid())
and email=(select p.email from public.aa_profiles p where p.user_id=auth.uid()));
drop policy if exists "groups readable by signed in" on public.aa_groups;
create policy "groups readable by signed in" on public.aa_groups for select to authenticated using(private.aa_is_verified_college_user());
drop policy if exists "members self or admin" on public.aa_group_members;
create policy "members self or admin" on public.aa_group_members for select to authenticated using(private.aa_is_verified_college_user() and (user_id=auth.uid() or private.aa_is_admin()));
drop policy if exists "audit insert authenticated" on public.aa_audit_log;
create policy "audit insert authenticated" on public.aa_audit_log for insert to authenticated with check(actor_user_id=auth.uid() and private.aa_is_verified_college_user());

revoke all on function private.aa_is_admin() from public,anon;
revoke all on function private.aa_is_editor() from public,anon;
revoke all on function private.aa_can_access_resource(uuid) from public;
grant execute on function private.aa_is_admin() to authenticated;
grant execute on function private.aa_is_editor() to authenticated;
grant execute on function private.aa_can_access_resource(uuid) to anon,authenticated;
