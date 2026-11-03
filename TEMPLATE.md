# Academic Affairs site template

This repository is a complete static Academic Affairs portal: a branded public site, a Supabase-backed visual editor, revision history, limited undo, live editor presence, and a CMS fallback file.

The public site and editor are free to reuse under the repository's Unlicense. The YCCC name, marks, campus photographs, and linked college content remain subject to their owners' rights.

## One-click front-end deployment

- **Use this GitHub template:** <https://github.com/YCCCVRLab/yccc-academic-affairs/generate> — choose **Use this template** to create your own copy, or fork it at <https://github.com/YCCCVRLab/yccc-academic-affairs/fork>.
- **Deploy to Netlify:** <https://app.netlify.com/start/deploy?repository=https://github.com/YCCCVRLab/yccc-academic-affairs>
- **Deploy to Vercel:** <https://vercel.com/new/clone?repository-url=https://github.com/YCCCVRLab/yccc-academic-affairs>

The repository has no build step. Publish the repository root.

These buttons deploy the static front end. For the editor, history, and sign-in features, create your own Supabase project and apply the migrations before giving anyone the admin URL.

## Connect your own Supabase project

1. Create a Supabase project and copy its Project URL and publishable/anon key.
2. Run `backend/supabase/schema.sql`, then every file in `backend/supabase/migrations/` in filename order. The latest migration enables revision history; live collaboration uses the editor's realtime channel.
3. Replace the two public values in `supabase-config.js`. Never put a service-role key in that file or anywhere in the browser bundle.
4. In Supabase Auth, set the Site URL and redirect allow-list to your deployed origin. Keep email confirmation enabled.
5. Configure an approved SMTP sender under **Authentication → Emails → SMTP Settings** before asking faculty to sign up. The built-in sender is limited to project-team addresses.
6. Bootstrap the first administrator with `backend/supabase/bootstrap-first-admin.sql` after that account has registered and verified.
7. Open `admin.html`, sign in, and use **Site Builder** to import or author pages.

## Move content between deployments

The Site Builder **Template & embed** panel exports a `site-template.json` snapshot of the current pages and site settings. It contains published and draft page content, so treat it as editorial data rather than a public asset. Keep secrets out of it.

## Embed the public site

Use an iframe when another site builder needs the published site inside a page:

```html
<iframe src="https://academicaffairs.libsite.com/" title="YCCC Academic Affairs"
  style="width:100%;height:900px;border:0" loading="lazy"></iframe>
```

The admin editor is intentionally not cross-origin embeddable: it uses authenticated Supabase sessions and should stay on the site's own origin. For a white-label deployment, fork this repository, change the branding fields in Site Builder, and host it at your own origin.

## What is stored where

- `aa_site_pages` — page rows, blocks, navigation, card metadata, publish state.
- `aa_site_settings` — organization name, hero, logo, theme colors, footer.
- `aa_site_revisions` — admin-only before/after snapshots used by History and Undo.
- `backend/firebase/site-content.json` — public failover snapshot, refreshed with `node scripts/export-site-backup.mjs`.
