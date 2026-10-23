-- Annual guided site check-in and admin-published faculty updates.
create table if not exists public.aa_site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 180),
  summary text not null default '' check (length(summary) <= 500),
  body text not null default '' check (length(body) <= 12000),
  url text not null default '',
  severity text not null default 'info' check (severity in ('info','warning','urgent')),
  published boolean not null default false,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (url = '' or url ~ '^https://')
);
create index if not exists aa_site_announcements_published_created_idx
  on public.aa_site_announcements(published, created_at desc);
alter table public.aa_site_announcements enable row level security;
grant select on public.aa_site_announcements to anon, authenticated;
grant insert, update, delete on public.aa_site_announcements to authenticated;
drop policy if exists "active site announcements readable" on public.aa_site_announcements;
create policy "active site announcements readable"
  on public.aa_site_announcements for select to anon, authenticated
  using (published and (expires_at is null or expires_at > now()));
drop policy if exists "admins manage site announcements" on public.aa_site_announcements;
create policy "admins manage site announcements"
  on public.aa_site_announcements for all to authenticated
  using (private.aa_is_admin()) with check (private.aa_is_admin());

create table if not exists public.aa_user_site_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visited_route_slugs text[] not null default '{}',
  tour_started_at timestamptz,
  last_tour_completed_at timestamptz,
  seen_announcement_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);
create index if not exists aa_user_site_state_updated_idx
  on public.aa_user_site_state(updated_at desc);
alter table public.aa_user_site_state enable row level security;
grant select, insert, update on public.aa_user_site_state to authenticated;
drop policy if exists "users view own site state or admins view all" on public.aa_user_site_state;
create policy "users view own site state or admins view all"
  on public.aa_user_site_state for select to authenticated
  using ((select auth.uid()) = user_id or private.aa_is_admin());
drop policy if exists "users create own site state" on public.aa_user_site_state;
create policy "users create own site state"
  on public.aa_user_site_state for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "users update own site state" on public.aa_user_site_state;
create policy "users update own site state"
  on public.aa_user_site_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
