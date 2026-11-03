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

The connected Supabase organization is on the Free plan and the project is ACTIVE_HEALTHY in `us-east-1`. The base schema and nine production migration versions are tracked in `schema.sql` and `migrations/`:

- Four initial sign-up, profile, verification, and privilege migrations.
- `20261023140834_site_builder_foundation.sql` — applied; admin-managed pages and site settings with RLS.
- `20261023140908_admin_activity_analytics.sql` — applied; one privacy-limited verified-user activity marker per UTC day.
- `20261023155702_annual_site_tour_and_faculty_updates.sql` — applied; RLS-protected admin notices, account-saved annual route tour progress, and admin-visible completion dates/area totals.
- `20261030180000_faculty_chairs_assessment.sql` — applied; chair roster, automatic Faculty Chairs group sync, restricted Assessment resource, and the first task-list page updates.
- `20261102140000_cte_and_faculty_resource_content.sql` — applied; expanded the CTE/Brightspace pages, replaced the internship, articulation, gender-equity, and prior-learning placeholders with legacy content, and added official YCCC/CTE brand visuals.

The project already has a verified administrator account. `bootstrap-first-admin.sql` is only for recovery if a trusted project owner explicitly needs to designate a new first admin.

## Site Builder and analytics

The admin page has Users, Groups, Resources, Activity, Site Builder, and Updates & Check-ins tabs. Site Builder edits current HTML pages, routes, hierarchy/order, navigation, home cards, links, embeds, content blocks, colors, hero image, and footer settings.

The first authenticated admin visit to Site Builder imported `fragment.html` into `aa_site_pages` and `aa_site_settings`. The live project currently holds 29 published pages plus the site-settings row, and one published announcement. The public `site-cms.js` renderer reads only published pages/settings and is part of `main`; `index.html` is the routed shell that the renderer fills in.

Faculty see an annual guided check-in that visits each published route and resource area, saves progress to their verified account, and records the completion date. Admins can publish notices to the public site's notification bell and see each faculty member's completion date and total areas visited. The check-in is a reminder and guide; it does not block access to the site. Announcements display only while published and before their optional expiration date.

Analytics stores one UTC activity date per verified user per day. It does not collect page URLs or IP addresses and cannot reconstruct visits from before release. The Admin Activity tab can summarize future activity by day, week, month, and year.

## Faculty Chairs and assessment access

The `aa_chair_roster` table is the source of truth for the Faculty Chairs group. The admin console's **Chairs** tab accepts the department-chair list pasted from Excel in this order: Department, Chair, Email, Additional FT faculty, Course Prefixes. Syncing marks missing chairs inactive and updates the roster; a database trigger adds matching verified profiles to the group and removes inactive ones. New chairs are added automatically after they create and verify their `@mainecc.edu` account.

The restricted **Assessment Materials for Department Chairs** resource points to the Assessment SharePoint folder and is granted to the Faculty Chairs group. The site controls who sees the link; Microsoft 365 permissions are separate and must be granted by a SharePoint owner. Use **Copy active emails** in the Chairs tab to paste the current list into the SharePoint sharing dialog.

## Hosting architecture

`https://academicaffairs.libsite.com/` is a LibSites page whose inline loader fetches `fragment.html` and `styles.css` from GitHub Pages, replaces `document.body` with the fragment, injects the CSS as a `<style>`, and then loads `script.js` from GitHub Pages. `index.html` is the standalone/direct-URL shell used for previews; the loader does not use it.

Because `script.js` runs with the LibSites document URL, a `./` path inside it resolves against `academicaffairs.libsite.com` and returns 404. The script therefore derives `AA_ASSET_BASE` from its own `src` (`document.currentScript`) and loads `supabase-config.js`, `site-cms.js`, `site-engagement.js`, and `admin.html` from that base. Keep new script URLs on `AA_ASSET_BASE`. Assets referenced from `fragment.html` or `styles.css` resolve against the page that injects them, so keep those absolute, as the hero image and embeds already are. GitHub Pages sends `access-control-allow-origin: *`, which the cross-origin fetch requires.

## Supabase Auth configuration

The Auth settings were read directly from the project on 2026-10-30:

- **Site URL** is `https://academicaffairs.libsite.com/`.
- **Redirect allow-list** contains both `https://academicaffairs.libsite.com/**` and `https://ycccvrlab.github.io/yccc-academic-affairs/**`.
- Email/password sign-up is enabled and email confirmation is required.
- A verified `@mainecc.edu` administrator account exists and has signed in.

One setting remains: **Authentication → Emails → SMTP Settings** has no custom SMTP host. Supabase's built-in sender only delivers to project-team addresses and is rate-limited (two messages per hour by default), so college-wide verification email will fail until an approved SMTP sender is configured. SMTP pricing is separate from the Supabase Free plan.

The application keeps credentials out of GitHub. No user password, SMTP secret, database password, access token, or service-role key belongs in this repository.

## Release state and verification

The deployment source is `main`. GitHub Pages hosts the assets; the public entry point is the LibSites loader at `https://academicaffairs.libsite.com/`, so changes take effect only after they are pushed and Pages republishes. Allow about ten minutes for GitHub Pages caches, or hard-refresh. Anonymous checks confirm only published pages and announcements are readable. The Auth URLs, required email confirmation, and first administrator are verified in the project. College-wide verification email still depends on configuring custom SMTP; until then, built-in delivery is limited to project-team addresses. Update notices display in the website notification bell.

From the repository root, check the branch JavaScript with:

```powershell
node --check script.js
node --check admin.js
node --check site-builder.js
node --check site-cms.js
node --check site-engagement.js
node --check admin-engagement.js
```
