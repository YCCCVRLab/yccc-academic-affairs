drop policy if exists "profile update self nonadmin" on public.aa_profiles;
create policy "profile update self nonadmin" on public.aa_profiles for update to authenticated
using (user_id=auth.uid() and not private.aa_is_admin())
with check (
  user_id=auth.uid()
  and role=(select p.role from public.aa_profiles p where p.user_id=auth.uid())
  and email=(select p.email from public.aa_profiles p where p.user_id=auth.uid())
);
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
drop trigger if exists aa_on_auth_user_email_updated on auth.users;
create trigger aa_on_auth_user_email_updated after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function private.aa_create_profile_for_verified_college_signup();
