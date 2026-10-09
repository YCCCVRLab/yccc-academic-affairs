-- YCCC Academic Affairs backend foundation (Supabase/Postgres)
-- Apply in the Supabase SQL Editor after creating a project.
-- Access is denied by default. Admin membership is managed by a trusted project owner,
-- never by a public client-side form.

create extension if not exists pgcrypto;

create table if not exists public.aa_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'viewer' check (role in ('viewer','editor','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aa_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.aa_group_members (
  group_id uuid not null references public.aa_groups(id) on delete cascade,
  user_id uuid not null references public.aa_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.aa_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  url text not null,
  category text not null default 'General',
  visibility text not null default 'signed_in' check (visibility in ('public','signed_in','restricted')),
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aa_resource_email_rules (
  resource_id uuid not null references public.aa_resources(id) on delete cascade,
  email text not null,
  primary key (resource_id, email)
);

create table if not exists public.aa_resource_group_rules (
  resource_id uuid not null references public.aa_resources(id) on delete cascade,
  group_id uuid not null references public.aa_groups(id) on delete cascade,
  primary key (resource_id, group_id)
);

create table if not exists public.aa_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.aa_is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.aa_profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.aa_is_editor()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.aa_profiles p
    where p.user_id = auth.uid() and p.role in ('editor','admin')
  );
$$;

create or replace function public.aa_can_access_resource(resource_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.aa_resources r
    where r.id = resource_id and r.published = true and (
      r.visibility = 'public'
      or (auth.uid() is not null and r.visibility = 'signed_in')
      or (
        auth.uid() is not null and r.visibility = 'restricted'
        and (
          exists (
            select 1 from public.aa_profiles p
            join public.aa_resource_email_rules e on lower(e.email) = lower(p.email)
            where p.user_id = auth.uid() and e.resource_id = r.id
          )
          or exists (
            select 1 from public.aa_group_members gm
            join public.aa_resource_group_rules gr on gr.group_id = gm.group_id
            where gm.user_id = auth.uid() and gr.resource_id = r.id
          )
        )
      )
    )
  );
$$;

alter table public.aa_profiles enable row level security;
alter table public.aa_groups enable row level security;
alter table public.aa_group_members enable row level security;
alter table public.aa_resources enable row level security;
alter table public.aa_resource_email_rules enable row level security;
alter table public.aa_resource_group_rules enable row level security;
alter table public.aa_audit_log enable row level security;

-- Profiles: users may read/update only their own non-role profile fields;
-- only admins may manage roles and other users.
drop policy if exists "profile read self or admin" on public.aa_profiles;
create policy "profile read self or admin" on public.aa_profiles for select to authenticated
using (user_id = auth.uid() or public.aa_is_admin());
drop policy if exists "profile update self nonadmin" on public.aa_profiles;
create policy "profile update self nonadmin" on public.aa_profiles for update to authenticated
using (user_id = auth.uid() and not public.aa_is_admin())
with check (user_id = auth.uid() and role = (select p.role from public.aa_profiles p where p.user_id = auth.uid()));
drop policy if exists "admin manage profiles" on public.aa_profiles;
create policy "admin manage profiles" on public.aa_profiles for all to authenticated
using (public.aa_is_admin()) with check (public.aa_is_admin());

drop policy if exists "groups readable by signed in" on public.aa_groups;
create policy "groups readable by signed in" on public.aa_groups for select to authenticated using (true);
drop policy if exists "admin manage groups" on public.aa_groups;
create policy "admin manage groups" on public.aa_groups for all to authenticated using (public.aa_is_admin()) with check (public.aa_is_admin());

drop policy if exists "members self or admin" on public.aa_group_members;
create policy "members self or admin" on public.aa_group_members for select to authenticated
using (user_id = auth.uid() or public.aa_is_admin());
drop policy if exists "admin manage members" on public.aa_group_members;
create policy "admin manage members" on public.aa_group_members for all to authenticated
using (public.aa_is_admin()) with check (public.aa_is_admin());

drop policy if exists "published resources readable if permitted" on public.aa_resources;
create policy "published resources readable if permitted" on public.aa_resources for select to anon, authenticated
using (public.aa_can_access_resource(id) or (auth.uid() is not null and public.aa_is_editor()));
drop policy if exists "editors manage resources" on public.aa_resources;
create policy "editors manage resources" on public.aa_resources for all to authenticated
using (public.aa_is_editor()) with check (public.aa_is_editor());

drop policy if exists "resource email rules admin only" on public.aa_resource_email_rules;
create policy "resource email rules admin only" on public.aa_resource_email_rules for all to authenticated
using (public.aa_is_admin()) with check (public.aa_is_admin());
drop policy if exists "resource group rules admin only" on public.aa_resource_group_rules;
create policy "resource group rules admin only" on public.aa_resource_group_rules for all to authenticated
using (public.aa_is_admin()) with check (public.aa_is_admin());

drop policy if exists "audit admin only" on public.aa_audit_log;
create policy "audit admin only" on public.aa_audit_log for select to authenticated using (public.aa_is_admin());
drop policy if exists "audit insert authenticated" on public.aa_audit_log;
create policy "audit insert authenticated" on public.aa_audit_log for insert to authenticated with check (actor_user_id = auth.uid());
