# Academic Affairs backend setup

The site uses the existing Supabase project `yccc-academic-affairs` on the organization's Free plan. Authentication is self-service email/password for verified `@mainecc.edu` users; there is no Entra dependency and no manual invitation workflow.

See [backend/supabase/README.md](supabase/README.md) for the access model and the remaining Auth email/bootstrap configuration. The database schema is in `backend/supabase/schema.sql`, with applied hardening migrations in `backend/supabase/migrations/`. The frontend uses only the public Supabase publishable key; never place service-role keys, SMTP credentials, database passwords, or access tokens in the repository.

The database creates new college-domain profiles with the viewer role and uses row-level security to enforce verified-email, role, group, and resource access checks. Admins assign roles and resource permissions from `admin.html`.

Before college-wide signup can deliver verification emails, a trusted Supabase project owner must configure the published site URLs, keep email confirmation enabled, and configure an approved SMTP sender. The first admin must self-register and verify their email; then a trusted project owner runs the one-time bootstrap SQL for that specific verified address. Supabase's built-in SMTP only sends to project-team-authorized addresses, so it is not suitable for college-wide signup.
