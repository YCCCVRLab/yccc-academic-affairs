# YCCC Academic Affairs access backend

This static GitHub Pages site uses the existing free-tier Supabase project `yccc-academic-affairs` for self-service college email/password sign-up, email verification, roles, groups, resource rules, and row-level security. It does not use Entra or manual invitations.

## Access model

- People create their own account on the site with a `@mainecc.edu` email and verify their mailbox.
- The Auth trigger creates a profile with the least-privileged `viewer` role. The database independently checks the verified email and college domain before releasing signed-in data or accepting role-based operations.
- Admins assign `viewer`, `editor`, or `admin` roles, group membership, and email/group rules for each resource in `admin.html`.
- A browser cannot grant itself a role. Email and role fields are immutable to the account owner.
- Only the Supabase publishable key is shipped to the browser. Never use or commit a secret/service-role key. Row-level security is the authorization boundary.
- External files (such as SharePoint documents) still require matching permissions in their own storage system.

## Project and database

The connected Supabase organization is on the Free plan. Its active project is in `us-east-1`. The base schema is `schema.sql`; the four applied production migrations are retained in `migrations/`. `bootstrap-first-admin.sql` is a one-time operation for a trusted project owner.

The application uses `supabase-config.js` with the public `sb_publishable_` key. That key is designed for browser use; it is not a secret credential. Database policies protect all data. Do not put database passwords, SMTP passwords, Supabase access tokens, or service-role/secret keys in this repository.

## Required before sign-in email can work for the college

The database and site code are prepared, but the connected project tools do not expose Supabase Auth URL, SMTP, or email-provider settings. A trusted Supabase project owner must complete these items in the Supabase Dashboard:

1. In **Authentication → URL Configuration**, set the Site URL to the published site and add its exact allowed redirects, including `https://ycccvrlab.github.io/yccc-academic-affairs/**` and the institution's production page URL.
2. In **Authentication → Providers → Email**, leave email/password enabled and require email confirmation.
3. Configure a custom SMTP sender that can deliver to all `@mainecc.edu` users. Supabase's built-in SMTP is for development and only sends to project-team-authorized addresses, so it will not support college-wide self-registration. Use the institution's approved SMTP service if available; SMTP provider pricing is separate from Supabase's Free plan.
4. After the code changes are published, the first administrator self-registers at the site and verifies the mailbox. Then the trusted project owner replaces the placeholder email in `bootstrap-first-admin.sql` and runs that statement once in the Supabase SQL Editor. This cannot be done safely without knowing which person should receive the first admin role.

After that, admins can manage access at `/admin.html`. No invitation or direct editing of Auth users is needed for routine onboarding.

## Local verification

From the repository root:

```powershell
node --check script.js
node --check admin.js
```
