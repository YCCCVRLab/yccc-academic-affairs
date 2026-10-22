-- Minimal analytics: one verified-user activity marker per UTC day.
-- No page URLs, IP addresses, or per-action events are collected.
alter table public.aa_groups
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.aa_user_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists aa_user_activity_daily_date_idx
  on public.aa_user_activity_daily(activity_date desc);

alter table public.aa_user_activity_daily enable row level security;
revoke all on table public.aa_user_activity_daily from anon, authenticated;
grant select, insert on table public.aa_user_activity_daily to authenticated;

drop policy if exists "users read own activity and admins read all" on public.aa_user_activity_daily;
create policy "users read own activity and admins read all"
  on public.aa_user_activity_daily for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.aa_is_admin()
  );

drop policy if exists "verified users record own current activity day" on public.aa_user_activity_daily;
create policy "verified users record own current activity day"
  on public.aa_user_activity_daily for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.aa_is_verified_college_user()
    and activity_date = (now() at time zone 'utc')::date
  );

