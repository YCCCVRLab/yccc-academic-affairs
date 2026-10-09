# Academic Affairs admin backend

This repository is published as a static GitHub Pages site. A static page or a list of allowed email addresses in JavaScript cannot securely enforce admin roles or hide private resource metadata. The backend schema here uses Supabase Auth + Postgres Row Level Security so permissions are checked by the database, not just by the browser.

## Included foundation
- `supabase/schema.sql`: profiles/roles, groups and memberships, resources, per-email and per-group access rules, audit log, and row-level security policies.
- Intended roles: `admin`, `editor`, and `viewer`.
- Intended resource visibility: `public`, `signed_in`, and `restricted`.

## Setup required before this becomes live
1. Create a Supabase project owned by the institution/team.
2. Review and run `supabase/schema.sql` in its SQL Editor.
3. Configure Supabase Auth to use the institution-approved sign-in method. Prefer Microsoft Entra ID SSO for `mainecc.edu` accounts; this requires an Entra app registration and tenant-admin approval.
4. Have the project owner create the first trusted admin profile for the correct authenticated user ID. Do not grant admin by accepting a role from the browser or by checking a typed email alone.
5. Store the Supabase project URL and publishable/anon key in site configuration. Never put the service-role key in HTML, JavaScript, or GitHub Pages.
6. Connect the site sign-in and admin UI to Supabase Auth and test with a public account, a normal user, an editor, and an admin before publishing.

## SharePoint assessment folder
The requested resource URL can be stored as a restricted resource with the approved emails and/or group assigned in the backend. Microsoft SharePoint permissions still govern the actual files. The folder must also be shared with those same people/groups inside Microsoft 365; a portal rule alone cannot grant or revoke access to SharePoint documents.

Suggested resource:
- Title: YCCC Academic Affairs Team — Assessment Documents
- Category: Assessment
- URL: the SharePoint Assessment folder URL supplied by the site owner
- Visibility: restricted
- Access: approved emails and/or a group such as Assessment Team

## Important current limitation
This is backend schema groundwork, not a live admin system yet. No production backend URL, tenant app credentials, or authenticated session is configured in this GitHub repository. Do not represent the current JavaScript email whitelist as secure authentication. The admin console must not be exposed as functional until real sign-in, server-side authorization, and row-level security are connected and tested.
