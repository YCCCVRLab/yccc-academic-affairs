# YCCC Academic Affairs access backend

This static Academic Affairs site uses the existing free-tier Supabase project for self-service `@mainecc.edu` email/password sign-up, email verification, roles, groups, resource rules, site editing, and row-level security. It does not use Entra or manual invitations.

## Access model

- People create and verify their own college email account.
- A database trigger creates new accounts with the least-privileged `viewer` role.
- Admins assign roles, group membership, and email/group rules for each resource in `admin.html`.
- A browser cannot grant itself a role. Email and role fields are protected from account-owner edits.
- Only the Supabase publishable key is shipped to the browser. Never use or commit a service-role/secret key.
- External files such as SharePoint documents still require matching permissions in their own storage system.

## Project and database

The connected Supabase organization is on the Free plan and the project is ACTIVE_HEALTHY in `us-east-1`. The base schema and six production migration versions are tracked in `schema.sql` and `migrations/`:

- Four initial sign-up, profile, verification, and privilege migrations.
- `20261023140834_site_builder_foundation.sql` — applied; admin-managed pages and site settings with RLS.
- `20261023140908_admin_activity_analytics.sql` — applied; one privacy-limited verified-user activity marker per UTC day.

The project already has a designated admin account. `bootstrap-first-admin.sql` is only for a future recovery/bootstrap if a trusted project owner explicitly needs to designate a new first admin.

## Site Builder and analytics

The admin page has Users, Groups, Resources, Activity, and Site Builder tabs. Site Builder edits current HTML pages, routes, hierarchy/order, navigation, home cards, links, embeds, content blocks, colors, hero image, and footer settings.

The first authenticated admin visit to Site Builder imports the current `fragment.html` into `aa_site_pages` and `aa_site_settings`. At the last database check those tables were empty, so this first import has not happened yet. The public `site-cms.js` renderer is on the `site-builder` branch and reads only published pages/settings.

Analytics stores one UTC activity date per verified user per day. It does not collect page URLs or IP addresses and cannot reconstruct visits from before release. The Admin Activity tab can summarize future activity by day, week, month, and year.

## Required Supabase Auth dashboard settings

The connected project tools do not expose the Auth URL allow-list, email provider, or SMTP settings. A trusted project owner must configure these in the Supabase Dashboard:

1. In **Authentication → URL Configuration**, set the Site URL to `https://academicaffairs.libsite.com`.
2. Add redirect patterns for `https://academicaffairs.libsite.com/**` and `https://ycccvrlab.github.io/yccc-academic-affairs/**`. The site asks Auth to return to the origin that initiated sign-up; the redirect allow-list must include it. The prior `localhost:3000` confirmation link indicates the production URL configuration still needs checking.
3. In **Authentication → Providers → Email**, keep email/password enabled and require email confirmation.
4. Configure an approved SMTP sender if college-wide delivery is required. Supabase's built-in SMTP is for development and only sends to project-team-authorized addresses; SMTP pricing is separate from the Supabase Free plan.

The application keeps credentials out of GitHub. No user password, SMTP secret, database password, access token, or service-role key belongs in this repository.

## Release state and verification

PR #3 is open and unmerged. The branch includes the admin builder, public CMS renderer, responsive/sidebar/arrow/accessibility fixes, and the migration files. Those changes are not live on LibSites until the PR is merged and the Pages/embed deployment is verified.

From the repository root, check the branch JavaScript with:

```powershell
node --check script.js
node --check admin.js
node --check site-builder.js
node --check site-cms.js
```
