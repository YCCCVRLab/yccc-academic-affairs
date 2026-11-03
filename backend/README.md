# Academic Affairs backend setup

The site uses the existing Supabase project `yccc-academic-affairs` on the organization's Free plan. Authentication is self-service email/password for verified `@mainecc.edu` users; there is no Entra dependency and no manual invitation workflow.

See [backend/supabase/README.md](supabase/README.md) for the access model and the remaining SMTP email configuration. The database schema is in `backend/supabase/schema.sql`, with applied hardening migrations in `backend/supabase/migrations/`. The frontend uses only the public Supabase publishable key; never place service-role keys, SMTP credentials, database passwords, or access tokens in the repository.

The database creates new college-domain profiles with the viewer role and uses row-level security to enforce verified-email, role, group, and resource access checks. Admins assign roles and resource permissions from `admin.html`. The **Chairs** tab keeps the Faculty Chairs group aligned with the current department-chair roster; the group controls the restricted Assessment Materials link, while SharePoint permissions remain separate.

The published site URLs, required email confirmation, and first administrator are already configured and verified in the project. College-wide signup still needs an approved SMTP sender under **Authentication → Emails → SMTP Settings**; Supabase's built-in SMTP only sends to project-team-authorized addresses, so it is not suitable for college-wide signup. `bootstrap-first-admin.sql` is only for recovery if a new first admin must be designated.

## Keeping the free project available

The workflow in `.github/workflows/keep-supabase-awake.yml` performs a lightweight public database read every six hours, which satisfies Supabase's activity requirement and also fails loudly if the project is unavailable. Supabase still pauses Free projects after a week of low activity, so the workflow is a mitigation rather than a guarantee. GitHub can disable scheduled workflows after 60 days of repository inactivity; re-enable the workflow or run it manually with **Actions → Keep Supabase active → Run workflow** if that happens.

## Public-content backup

`scripts/export-site-backup.mjs` writes published pages, settings, and announcements to `backend/firebase/site-content.json`. `site-cms.js` falls back to that snapshot if the Supabase public queries fail, so the site remains readable while a paused project is restored. The snapshot contains no users, profiles, groups, private resources, or activity data. The `Back up site content` workflow refreshes it daily and copies it to Firestore when the `FIREBASE_SERVICE_ACCOUNT` repository secret is present. See [firebase/README.md](firebase/README.md) for setup and manual commands.
