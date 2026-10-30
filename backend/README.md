# Academic Affairs backend setup

The site uses the existing Supabase project `yccc-academic-affairs` on the organization's Free plan. Authentication is self-service email/password for verified `@mainecc.edu` users; there is no Entra dependency and no manual invitation workflow.

See [backend/supabase/README.md](supabase/README.md) for the access model and the remaining SMTP email configuration. The database schema is in `backend/supabase/schema.sql`, with applied hardening migrations in `backend/supabase/migrations/`. The frontend uses only the public Supabase publishable key; never place service-role keys, SMTP credentials, database passwords, or access tokens in the repository.

The database creates new college-domain profiles with the viewer role and uses row-level security to enforce verified-email, role, group, and resource access checks. Admins assign roles and resource permissions from `admin.html`.

The published site URLs, required email confirmation, and first administrator are already configured and verified in the project. College-wide signup still needs an approved SMTP sender under **Authentication → Emails → SMTP Settings**; Supabase's built-in SMTP only sends to project-team-authorized addresses, so it is not suitable for college-wide signup. `bootstrap-first-admin.sql` is only for recovery if a new first admin must be designated.
