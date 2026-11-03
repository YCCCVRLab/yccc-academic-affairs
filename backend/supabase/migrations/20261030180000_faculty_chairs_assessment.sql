-- Faculty chair roster and assessment access.
-- The roster is the source of truth for the "Faculty Chairs" group. A trigger keeps
-- group membership aligned when chairs are added, removed, or later register.

create table if not exists public.aa_chair_roster (
  email text primary key check (email = lower(email)),
  display_name text not null default '',
  departments text not null default '',
  course_prefixes text not null default '',
  additional_faculty text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.aa_chair_roster enable row level security;

drop policy if exists "chair roster admin only" on public.aa_chair_roster;
create policy "chair roster admin only" on public.aa_chair_roster
  for all to authenticated
  using (private.aa_is_admin())
  with check (private.aa_is_admin());

grant select, insert, update, delete on public.aa_chair_roster to authenticated;

insert into public.aa_groups (name, description, updated_at)
values (
  'Faculty Chairs',
  'Verified YCCC department chairs. Membership is synchronized from the chair roster.',
  now()
)
on conflict (name) do update
set description = excluded.description,
    updated_at = now();

create or replace function private.aa_faculty_chairs_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.aa_groups where name = 'Faculty Chairs' limit 1;
$$;

create or replace function private.aa_sync_chair_email(p_email text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := private.aa_faculty_chairs_group_id();
begin
  if v_group is null or p_email is null or btrim(p_email) = '' then
    return;
  end if;

  if p_active then
    insert into public.aa_group_members (group_id, user_id)
    select v_group, p.user_id
    from public.aa_profiles p
    where lower(p.email) = lower(p_email)
    on conflict do nothing;
  else
    delete from public.aa_group_members gm
    using public.aa_profiles p
    where gm.group_id = v_group
      and gm.user_id = p.user_id
      and lower(p.email) = lower(p_email);
  end if;
end;
$$;

create or replace function private.aa_sync_chair_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean;
begin
  if tg_op = 'DELETE' then
    delete from public.aa_group_members gm
    using public.aa_groups g
    where gm.user_id = old.user_id
      and gm.group_id = g.id
      and g.name = 'Faculty Chairs';
    return old;
  end if;

  if tg_op = 'UPDATE' and old.email is distinct from new.email then
    perform private.aa_sync_chair_email(old.email, false);
  end if;

  select active into v_active
  from public.aa_chair_roster
  where lower(email) = lower(new.email);

  perform private.aa_sync_chair_email(new.email, coalesce(v_active, false));
  return new;
end;
$$;

create or replace function private.aa_sync_chair_roster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform private.aa_sync_chair_email(old.email, false);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.email is distinct from new.email then
    perform private.aa_sync_chair_email(old.email, false);
  end if;

  perform private.aa_sync_chair_email(new.email, new.active);
  return new;
end;
$$;

drop trigger if exists aa_profiles_sync_chair_group on public.aa_profiles;
create trigger aa_profiles_sync_chair_group
after insert or update or delete on public.aa_profiles
for each row execute function private.aa_sync_chair_profile();

drop trigger if exists aa_chair_roster_sync_group on public.aa_chair_roster;
create trigger aa_chair_roster_sync_group
after insert or update or delete on public.aa_chair_roster
for each row execute function private.aa_sync_chair_roster();

insert into public.aa_chair_roster (email, display_name, departments, course_prefixes, additional_faculty, active)
values
  ('mmcneilbrown@mainecc.edu', 'Michelle McNeil-Brown', 'Accounting, Business, Finance, Economics', 'ACC, BUS, FIN, ECO', '', true),
  ('mlee@mainecc.edu', 'Michael Lee', 'Art, Multimedia/Digital Media', 'ART, MUL', '', true),
  ('cferrick@mainecc.edu', 'Cathleen Ferrick', 'Behavioral Health Studies, Social Work, Human Services', 'BHS, SWO, HUS', '', true),
  ('acrampton@mainecc.edu', 'Anne Crampton', 'CAD, CIS, Health Studies, NET, WEB', 'ALH, WEB, CIS, NET, CAD', '', true),
  ('tburton@mainecc.edu', 'Tim Burton', 'Criminal Justice, Leadership, Legal', 'CJS, LDR, LEG', '', true),
  ('lmurphy@mainecc.edu', 'Lisa Murphy', 'Social Sciences, Education', 'PSY, SOC, EDU, POS', '', true),
  ('mlovejoy@mainecc.edu', 'Michael Lovejoy', 'Electrical', 'ELC', '', true),
  ('dsusman@mainecc.edu', 'David Susman', 'English, Speech, Humanities, History, Philosophy', 'ENG, SPE, HUM, HIS, PHI', '', true),
  ('jmallett@mainecc.edu', 'Jennifer Mallett', 'Math, Physics', 'MAT, PHY', 'Sam Kelley', true),
  ('ktrumanallen@mainecc.edu', 'Kristen Truman Allen', 'Nursing', 'NUR', 'Maura Reed, Abby Rydel, Vicki Petalas', true),
  ('mniswonger@mainecc.edu', 'Maria Niswonger', 'Science', 'BIO, CHM', '', true),
  ('jbodkin@mainecc.edu', 'Julie Bodkin', 'Vet Tech, Animal Care Management', 'VET, ACM', 'Kristen Harmon', true),
  ('bfoust@mainecc.edu', 'Brand Foust', 'Welding', 'WLD', '', true)
on conflict (email) do update
set display_name = excluded.display_name,
    departments = excluded.departments,
    course_prefixes = excluded.course_prefixes,
    additional_faculty = excluded.additional_faculty,
    active = excluded.active,
    updated_at = now();

insert into public.aa_resources (title, description, url, category, visibility, published, created_by)
select
  'Assessment Materials for Department Chairs',
  'Restricted SharePoint folder for assessment reports, program review data, and planning materials. Sign in with your @mainecc.edu account. SharePoint permissions must also be granted by Academic Affairs.',
  'https://mainecc.sharepoint.com/:f:/r/sites/ycccacademicaffairsteam/Shared%20Documents/Assessment?d=w92fee3add4e248aabeaf958d79d34220&csf=1&web=1&e=nwxxj3',
  'Assessment',
  'restricted',
  true,
  (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1)
where not exists (
  select 1 from public.aa_resources
  where title = 'Assessment Materials for Department Chairs'
);

update public.aa_resources
set description = 'Restricted SharePoint folder for assessment reports, program review data, and planning materials. Sign in with your @mainecc.edu account. SharePoint permissions must also be granted by Academic Affairs.',
    url = 'https://mainecc.sharepoint.com/:f:/r/sites/ycccacademicaffairsteam/Shared%20Documents/Assessment?d=w92fee3add4e248aabeaf958d79d34220&csf=1&web=1&e=nwxxj3',
    category = 'Assessment',
    visibility = 'restricted',
    published = true,
    updated_at = now()
where title = 'Assessment Materials for Department Chairs';

insert into public.aa_resource_group_rules (resource_id, group_id)
select r.id, g.id
from public.aa_resources r
join public.aa_groups g on g.name = 'Faculty Chairs'
where r.title = 'Assessment Materials for Department Chairs'
on conflict do nothing;

update public.aa_site_pages
set title = 'Early Alert',
    summary = 'Academic concerns: attendance, missing work, low grades, and other signs a student is falling behind.',
    blocks = jsonb_build_array(jsonb_build_object(
      'type', 'legacy_html',
      'html', $html$
    <div class="breadcrumb-row"><span>Frequently-Used Forms</span><b>›</b><strong>Early Alert</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Academic Support</p><h2>Early Alert</h2></div><a class="outline-button" href="#/forms">All forms</a></div>
    <p class="lead">Use Early Alert for academic concerns: attendance, missing work, low grades, or other signs that a student is falling behind in a course.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Submit an Early Alert</h3><p>Use the official YCCC help-desk form. Include the course, the concern, and any support you have already offered.</p><a class="action-link" href="https://help.yccc.edu/form?queue_id=7691" target="_blank" rel="noopener">Open Early Alert Form ↗</a></article>
      <article class="content-card"><h3>When to use Early Alert</h3><p>Use it when an academic issue is affecting a student's progress. For mental health, food insecurity, transportation, or other basic-needs barriers, use Care Team instead.</p><a class="action-link" href="#/forms/care-team">Go to Care Team</a></article>
    </div>
    <aside class="cms-callout info"><strong>Separate referral paths:</strong> Early Alert addresses academic progress. Care Team addresses non-academic barriers and student wellbeing.</aside>
  $html$)
    )),
    updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
    updated_at = now()
where slug = 'early-alert';

update public.aa_site_pages
set title = 'Care Team',
    summary = 'Basic-needs, mental-health, and other non-academic barriers that may affect a student.',
    blocks = jsonb_build_array(jsonb_build_object(
      'type', 'legacy_html',
      'html', $html$
    <div class="breadcrumb-row"><span>Frequently-Used Forms</span><b>›</b><strong>Care Team</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Student Support</p><h2>Care Team</h2></div><a class="outline-button" href="#/forms">All forms</a></div>
    <p class="lead">Use Care Team for non-academic barriers: mental health, food insecurity, transportation, housing, or other basic-needs concerns.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Submit a Care Team referral</h3><p>Use the official YCCC CARE referral form. Share the concern and any immediate safety information; do not include unnecessary private details.</p><a class="action-link" href="https://yccc.libwizard.com/f/CARE_TEAM_Form" target="_blank" rel="noopener">Open Care Team Form ↗</a></article>
      <article class="content-card"><h3>When to use Care Team</h3><p>Use it when a student needs support beyond the classroom. For attendance, missing work, or grades, use Early Alert instead.</p><a class="action-link" href="#/forms/early-alert">Go to Early Alert</a></article>
    </div>
    <aside class="cms-callout info"><strong>Separate referral paths:</strong> Care Team addresses non-academic barriers. Early Alert addresses academic progress.</aside>
  $html$)
    )),
    updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
    updated_at = now()
where slug = 'care-team';

update public.aa_site_pages
set title = 'Curriculum Committee',
    summary = 'Curriculum Committee forms, handbook, templates, and proposal guidance.',
    blocks = jsonb_build_array(jsonb_build_object(
      'type', 'legacy_html',
      'html', $html$
    <div class="breadcrumb-row"><span>Frequently-Used Forms</span><b>›</b><strong>Curriculum Committee</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Curriculum</p><h2>Curriculum Committee</h2></div><a class="outline-button" href="#/forms">All forms</a></div>
    <p class="lead">Forms, the committee handbook, templates, and approval guidance for course and program curriculum work.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Forms and templates</h3><p>Current proposal, revision, and supporting templates are maintained in the Academic Affairs SharePoint. Sign in with your @mainecc.edu account.</p><a class="action-link" href="https://mainecc.sharepoint.com/sites/ycccacademicaffairsteam/Shared%20Documents" target="_blank" rel="noopener">Open Academic Affairs SharePoint ↗</a></article>
      <article class="content-card"><h3>Curriculum Committee handbook</h3><p>Use the current handbook for proposal standards, review steps, and committee expectations. Contact Academic Affairs if you need the current file or cannot access the folder.</p><a class="action-link" href="mailto:acrampton@mainecc.edu">Contact Academic Affairs</a></article>
    </div>
    <aside class="cms-callout info"><strong>Department chairs:</strong> Start with the current handbook and templates before submitting a proposal. Academic Affairs can confirm the appropriate form for your request.</aside>
  $html$)
    )),
    updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
    updated_at = now()
where slug = 'curriculum-committee';

update public.aa_site_pages
set title = 'Faculty Advising',
    summary = 'Advising handbook, Anthology portal, degree planning, registration, and student referrals.',
    blocks = jsonb_build_array(jsonb_build_object(
      'type', 'legacy_html',
      'html', $html$
    <div class="breadcrumb-row"><span>Faculty Resources</span><b>›</b><strong>Faculty Advising</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Faculty Resources</p><h2>Faculty Advising</h2></div><a class="outline-button" href="#/faculty-resources">All faculty resources</a></div>
    <p class="lead">Advising guidance and the tools faculty use for degree planning, registration, and student referrals.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Faculty Advising Handbook</h3><p>Use the current handbook for advising expectations, processes, and referral guidance. The handbook is maintained in the Academic Affairs SharePoint.</p><a class="action-link" href="https://mainecc.sharepoint.com/sites/ycccacademicaffairsteam/Shared%20Documents" target="_blank" rel="noopener">Open Academic Affairs SharePoint ↗</a></article>
      <article class="content-card"><h3>Anthology Student Portal</h3><p>Open the My YCCC / Anthology portal for academic information, advising, registration, and student services.</p><a class="action-link" href="https://my.yccc.edu/ICS/" target="_blank" rel="noopener">Open Anthology portal ↗</a></article>
    </div>
    <div class="content-card-grid">
      <article class="content-card"><h3>Academic concerns</h3><p>Use Early Alert when attendance, missing work, or grades are affecting a student's progress.</p><a class="action-link" href="#/forms/early-alert">Open Early Alert</a></article>
      <article class="content-card"><h3>Basic-needs or wellbeing concerns</h3><p>Use Care Team for mental health, food insecurity, transportation, housing, or other non-academic barriers.</p><a class="action-link" href="#/forms/care-team">Open Care Team</a></article>
    </div>
  $html$)
    )),
    updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
    updated_at = now()
where slug = 'faculty-advising';

update public.aa_site_pages
set title = 'Assessment Data for Department Chairs',
    summary = 'Restricted assessment materials and program-review data for current department chairs.',
    blocks = jsonb_build_array(jsonb_build_object(
      'type', 'legacy_html',
      'html', $html$
    <div class="breadcrumb-row"><span>Faculty Resources</span><b>›</b><strong>Assessment Data for Department Chairs</strong></div>
    <div class="detail-heading"><div><p class="eyebrow">Department Chairs</p><h2>Assessment Data for Department Chairs</h2></div><a class="outline-button" href="#/faculty-resources">All faculty resources</a></div>
    <p class="lead">Current department chairs can access the restricted Assessment SharePoint folder after signing in with a verified @mainecc.edu account.</p>
    <div class="content-card-grid">
      <article class="content-card"><h3>Assessment Materials</h3><p>Annual assessment reports, program review data, and planning materials are in the restricted folder. Sign in, then open <strong>Resources shared with you</strong> at the bottom of the page.</p><a class="action-link" href="#managedResources">Open Resources shared with you</a></article>
      <article class="content-card"><h3>Need access?</h3><p>If you are a current department chair and do not see the folder, contact Academic Affairs. New chairs are added after their @mainecc.edu account is verified.</p><a class="action-link" href="mailto:acrampton@mainecc.edu">Contact Academic Affairs</a></article>
    </div>
    <aside class="cms-callout warning"><strong>Two permissions are required:</strong> your verified Academic Affairs account must be in the Faculty Chairs group, and the SharePoint folder must be shared with your MaineCC Microsoft 365 account.</aside>
  $html$)
    )),
    updated_by = (select user_id from public.aa_profiles where role = 'admin' order by created_at limit 1),
    updated_at = now()
where slug = 'assessment-data';
