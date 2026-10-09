-- Admin-managed site builder data for the YCCC Academic Affairs static site.
create table if not exists public.aa_site_pages (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_slug text references public.aa_site_pages(slug) on delete cascade,
  page_order integer not null default 0,
  title text not null,
  nav_label text not null default '',
  summary text not null default '',
  category text not null default '',
  icon text not null default '',
  accent text not null default 'navy' check (accent ~ '^[a-zA-Z0-9_-]{1,32}$'),
  home_links jsonb not null default '[]'::jsonb check (jsonb_typeof(home_links) = 'array'),
  content_type text not null default 'standard'
    check (content_type in ('standard','landing','article','directory')),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  is_home boolean not null default false,
  show_in_nav boolean not null default true,
  show_home_card boolean not null default false,
  published boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_slug is null or parent_slug <> slug)
);

create index if not exists aa_site_pages_parent_order_idx
  on public.aa_site_pages(parent_slug, page_order, title);

create table if not exists public.aa_site_settings (
  singleton boolean primary key default true check (singleton),
  organization_name text not null default 'York County Community College',
  site_name text not null default 'Academic Affairs',
  hero_eyebrow text not null default 'York County Community College',
  hero_title text not null default 'Academic Affairs',
  hero_description text not null default 'Faculty resources, teaching support, academic information, forms, policies, and professional learning.',
  hero_image_url text not null default '',
  logo_url text not null default 'https://www.nsnsports.net/wp-content/uploads/MascotLogoStack.png',
  footer_name text not null default 'York County Community College',
  footer_label text not null default 'Academic Affairs',
  footer_links jsonb not null default '[]'::jsonb check (jsonb_typeof(footer_links) = 'array'),
  theme jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.aa_site_pages enable row level security;
alter table public.aa_site_settings enable row level security;

grant select on public.aa_site_pages to anon, authenticated;
grant insert, update, delete on public.aa_site_pages to authenticated;
grant select on public.aa_site_settings to anon, authenticated;
grant insert, update, delete on public.aa_site_settings to authenticated;

drop policy if exists "published site pages readable" on public.aa_site_pages;
create policy "published site pages readable"
  on public.aa_site_pages for select to anon, authenticated
  using (published = true);
drop policy if exists "admins manage site pages" on public.aa_site_pages;
create policy "admins manage site pages"
  on public.aa_site_pages for all to authenticated
  using (private.aa_is_admin()) with check (private.aa_is_admin());

drop policy if exists "site settings readable" on public.aa_site_settings;
create policy "site settings readable"
  on public.aa_site_settings for select to anon, authenticated using (true);
drop policy if exists "admins manage site settings" on public.aa_site_settings;
create policy "admins manage site settings"
  on public.aa_site_settings for all to authenticated
  using (private.aa_is_admin()) with check (private.aa_is_admin());
