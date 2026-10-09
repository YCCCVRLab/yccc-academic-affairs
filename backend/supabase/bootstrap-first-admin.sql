-- Trusted project owner only: after the first administrator self-registers and verifies
-- a @mainecc.edu email, replace the literal below with that exact verified email and run once.
insert into public.aa_profiles (user_id, email, display_name, role)
select u.id, lower(u.email), coalesce(nullif(u.raw_user_meta_data->>'full_name',''),split_part(u.email,'@',1)), 'admin'
from auth.users u
where lower(u.email)=lower('REPLACE_WITH_VERIFIED_COLLEGE_EMAIL')
  and u.email_confirmed_at is not null
  and lower(u.email) ~ '^[^[:space:]@]+@mainecc[.]edu$'
on conflict (user_id) do update
set role='admin', email=excluded.email, updated_at=now()
where public.aa_profiles.email=excluded.email;
