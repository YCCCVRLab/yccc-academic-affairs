# Disaster recovery

This is the runbook for bringing the Academic Affairs site back up from a fresh clone of this repository. It assumes no local files, browser sessions, or earlier deployment state. It does assume that the owner can sign in to the accounts listed below, because credentials, private data, and external services are intentionally not stored in Git.

Last verified against the repository: 2026-11-13.

## What the repository can restore

- The complete static front end: `index.html`, `fragment.html`, `styles.css`, JavaScript, images, and the admin console.
- The database structure: `backend/supabase/schema.sql` and every file in `backend/supabase/migrations/`.
- The latest committed public-content snapshot: `backend/firebase/site-content.json`.
- The optional Firestore backup workflow and uploader in `backend/firebase/`.
- The GitHub Actions health check and public-content backup workflow.
- The first-admin recovery SQL and hosting instructions in the existing README files.

## What the repository cannot restore

These items require an account, a secret, or a source outside Git:

- Supabase users, passwords, sessions, roles, groups, private-resource rules, activity history, revisions, and unpublished drafts.
- Live CMS content newer than the last committed `site-content.json` snapshot. The backup workflow runs every ten minutes, but it can be stale or disabled.
- The LibSites page and its domain/SSL configuration.
- DNS records, custom domains, SMTP credentials, SharePoint permissions, and the optional Firebase service account.
- The GitHub repository itself. If the repository is deleted, keep an off-GitHub mirror or archive so this runbook and the code remain available.

If the problem is only the public site, the committed snapshot may already keep the public pages readable while Supabase is down. Supabase is still required for sign-in, admin changes, private resources, and writes.

## Access checklist

Have these before starting:

- GitHub organization/repository admin access and permission to enable Pages and Actions.
- Supabase organization owner access for the project (SQL Editor and Authentication settings).
- LibApps/LibSites admin access for the public page and its domain settings.
- The approved SMTP provider credentials, if email verification must work for the whole college.
- Supabase service-role key, only for the one-time content restore command below. Never commit it or put it in client code.
- Firebase service-account secret only if the optional Firestore copy is being restored.
- SharePoint owner access for the linked documents; the website only controls who sees a link.

## Recovery order

1. Restore GitHub Pages.
2. Restore the LibSites public entry page.
3. Restore or rebuild Supabase.
4. Restore published CMS content into Supabase.
5. Restore administrator access.
6. Verify the public site and admin console.
7. Refresh the backups and record what changed.

## 1. Restore GitHub Pages

GitHub Pages serves both the public assets and the admin console. There is no build step; publish the repository root.

```bash
git clone https://github.com/YCCCVRLab/yccc-academic-affairs.git
cd yccc-academic-affairs
git switch main
```

In the GitHub repository:

1. Open **Settings → Pages**.
2. Set **Source** to **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`, then save.
4. Wait for the Pages deployment to finish. A first deployment after a repository restore can take several minutes.

Verify the asset host:

```bash
curl -I https://ycccvrlab.github.io/yccc-academic-affairs/
curl -I https://ycccvrlab.github.io/yccc-academic-affairs/fragment.html
curl -I https://ycccvrlab.github.io/yccc-academic-affairs/styles.css
curl -I https://ycccvrlab.github.io/yccc-academic-affairs/script.js
curl -I https://ycccvrlab.github.io/yccc-academic-affairs/admin.html
```

All should return `200` (or a normal redirect), and the HTML/CSS/JavaScript should have the expected content types. If Pages is down, the public site cannot load its assets. If only the normal LibSites entry point is unavailable but Pages is healthy, `https://ycccvrlab.github.io/yccc-academic-affairs/index.html` is a temporary direct URL, but it is not the normal branded entry point.

Optional static checks after a fresh clone:

```bash
node --check script.js
node --check admin.js
node --check site-builder.js
node --check site-cms.js
node --check site-engagement.js
node --check admin-engagement.js
```

## 2. Restore the LibSites public entry page

The public URL is a LibSites page whose inline loader replaces the page body with `fragment.html`, injects `styles.css`, and then loads `script.js` from GitHub Pages. The loader is the bridge between LibSites and the repository; the GitHub assets alone do not create the `libsite.com` URL.

In LibSites/LibApps:

1. Open the Academic Affairs site and its home page (or create a blank/full-width page if the old page was deleted).
2. Add an HTML/embed block that allows scripts.
3. Paste this loader, replacing nothing unless the asset repository moves:

```html
<script>
(async () => {
  const base = 'https://ycccvrlab.github.io/yccc-academic-affairs/';
  const version = '?v=' + Date.now();

  try {
    const [html, css] = await Promise.all([
      fetch(base + 'fragment.html' + version, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw Error(response.status);
        return response.text();
      }),
      fetch(base + 'styles.css' + version, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw Error(response.status);
        return response.text();
      })
    ]);

    document.body.innerHTML = html;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const script = document.createElement('script');
    script.src = base + 'script.js' + version;
    document.body.appendChild(script);
  } catch (error) {
    console.error('Academic Affairs loader failed:', error);
  }
})();
</script>
```

4. Publish the page and hard-refresh it.

The page should replace the LibSites body with the Academic Affairs header, banner, content, and footer. If it stays blank, open the browser console and check for `Academic Affairs loader failed`. The usual causes are a typo in `base`, GitHub Pages not being live, or a LibSites page setting that strips scripts.

If the old LibSites subdomain is gone, create/rename the site through Springshare Support. The domain and certificate are managed outside this repository. After a URL change, update the Supabase Auth settings described below and update every link to the old URL.

## 3. Restore Supabase

### 3a. The existing project is paused or unhealthy

Open the Supabase dashboard and restore/unpause the project. The project is on the Free plan, so it can pause after inactivity. After it is healthy:

1. Open **Actions → Keep Supabase active → Run workflow** in GitHub to run the health check immediately.
2. Confirm the workflow can read `aa_site_settings`.
3. Open the public site and verify that the account menu can sign in again.

The public pages can remain readable from `backend/firebase/site-content.json` while the project is paused, but sign-in and admin actions will not work.

### 3b. The Supabase project is lost

These steps rebuild the backend from the repository. They do not recreate existing user passwords or private data.

1. Create a new Supabase project in the same region if possible.
2. Copy its **Project URL** and **publishable/anon key**.
3. Update the two public values in `supabase-config.js`:

   ```js
   window.AA_SUPABASE_CONFIG = {
     url: 'https://<new-project-ref>.supabase.co',
     publishableKey: '<new-publishable-key>'
   };
   ```

   Commit and push this change. Never put a service-role key in this file or anywhere in the browser bundle.

   Also update the two public values in `.github/workflows/keep-supabase-awake.yml` (`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`) so the scheduled health check monitors the new project rather than the old one.

4. In the Supabase **SQL Editor**, run `backend/supabase/schema.sql`.
5. Then run every file in `backend/supabase/migrations/` **one at a time, in filename order**. Do not skip a failed migration; stop and fix the error before continuing.

   The committed order is:

   ```text
   20261009161416_college_signup_profiles_and_private_rls_helpers.sql
   20261009161953_protect_profile_authorization_fields.sql
   20261009162228_require_verified_college_identity_for_data.sql
   20261009162645_limit_anon_table_privileges.sql
   20261023140834_site_builder_foundation.sql
   20261023140908_admin_activity_analytics.sql
   20261023155702_annual_site_tour_and_faculty_updates.sql
   20261030180000_faculty_chairs_assessment.sql
   20261102140000_cte_and_faculty_resource_content.sql
   20261103120000_cte_team_contact_emails.sql
   20261103170000_site_builder_history_and_collaboration.sql
   ```

6. In **Authentication → URL Configuration**, set the **Site URL** to `https://ycccacademicaffairs.libsite.com/` and add both allowed redirect patterns:

   ```text
   https://ycccacademicaffairs.libsite.com/**
   https://ycccvrlab.github.io/yccc-academic-affairs/**
   ```

   The retired `https://academicaffairs.libsite.com/` origin should not be added back.

7. Keep email confirmation enabled. Configure **Authentication → Emails → SMTP Settings** with the approved college SMTP sender before inviting the whole college; Supabase's built-in sender is limited to project-team addresses and is rate-limited.

8. Have the intended administrator register and verify a `@mainecc.edu` account. Then open `backend/supabase/bootstrap-first-admin.sql`, replace `REPLACE_WITH_VERIFIED_COLLEGE_EMAIL` with that exact verified email, and run the whole file once in the SQL Editor. The script promotes only an already-verified college account; do not commit a real address if the repository is public.

9. Restore the public CMS content from the committed snapshot using step 4.
10. Recreate anything not in the snapshot: groups, private resource rules, chair roster, announcements that were not published, drafts, and revision history. The public snapshot intentionally contains none of the private data.

## 4. Restore published CMS content

The public front end loads the committed snapshot first, so visitors can still read the last published site while Supabase is unavailable. Restoring the rows into Supabase is what makes the Site Builder and future edits work again.

The snapshot is `backend/firebase/site-content.json`. It contains published pages, site settings, and the last 30 published announcements. It does not contain users, groups, private resources, drafts, or revisions.

If a fresher artifact exists, download it from **Actions → Back up site content** and replace the committed file before running the import. Otherwise use the file already in the clone.

Run this from the repository root with Node 18 or newer. Use the Supabase **service-role** key only in the environment for this one command; never save it in the repository or browser code.

```bash
SUPABASE_URL='https://<new-project-ref>.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='<service-role-key-from-supabase-dashboard>' \
node --input-type=module - <<'EOF'
import { readFile } from 'node:fs/promises';

const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');

const snapshot = JSON.parse(await readFile('backend/firebase/site-content.json', 'utf8'));
if (!Array.isArray(snapshot.pages) || !snapshot.pages.length) {
  throw new Error('The snapshot has no published pages; refusing to import.');
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal'
};

async function upsert(table, rows) {
  if (!rows.length) return;
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows)
  });
  if (!response.ok) {
    throw new Error(`${table}: HTTP ${response.status} ${(await response.text()).slice(0, 500)}`);
  }
}

// updated_by references auth.users; old user IDs do not exist in a new project.
const pages = snapshot.pages.map(({ updated_by, ...page }) => ({
  ...page,
  parent_slug: page.parent_slug || null,
  updated_by: null
}));
const bySlug = new Map(pages.map(page => [page.slug, page]));

for (const page of pages) {
  if (page.parent_slug && !bySlug.has(page.parent_slug)) {
    console.warn(`Missing parent ${page.parent_slug}; importing ${page.slug} as a top-level page.`);
    page.parent_slug = null;
  }
}

// Insert parents before children so the self-referencing FK is satisfied.
const ordered = [];
const seen = new Set();
const visit = page => {
  if (seen.has(page.slug)) return;
  if (page.parent_slug && bySlug.has(page.parent_slug)) visit(bySlug.get(page.parent_slug));
  seen.add(page.slug);
  ordered.push(page);
};
pages.forEach(visit);

await upsert('aa_site_pages', ordered);
await upsert('aa_site_settings', snapshot.settings ? [{ ...snapshot.settings, updated_by: null }] : []);
await upsert('aa_site_announcements', (snapshot.announcements || []).map(item => ({ ...item, published: true })));

console.log(`Restored ${ordered.length} page(s), settings, and ${(snapshot.announcements || []).length} announcement(s).`);
EOF
```

After the import, run the normal snapshot exporter to confirm the project is readable with the public key:

```bash
node scripts/export-site-backup.mjs
```

If the exporter refuses because there are no published pages, check the import error and the RLS policies. Do not overwrite the committed snapshot with an empty result.

## 5. Restore administrator access

The admin console is served directly from GitHub Pages:

```text
https://ycccvrlab.github.io/yccc-academic-affairs/admin.html
```

If the console loads but the account cannot administer:

1. Sign in with a verified `@mainecc.edu` account.
2. If the account has no profile, register and verify it first.
3. If the profile exists but the role is wrong, run this in the Supabase SQL Editor, replacing the email:

   ```sql
   update public.aa_profiles
   set role = 'admin', updated_at = now()
   where lower(email) = lower('REPLACE_WITH_VERIFIED_COLLEGE_EMAIL');
   ```

4. If no verified account exists, register one, verify the email, then run `backend/supabase/bootstrap-first-admin.sql` after replacing its placeholder.
5. Sign out and back in after the role change.

If the Supabase project itself was lost, existing users cannot be recovered from Git. Each administrator and faculty member must create a new account and verify it again. Restore the admin role for the first verified account, then reassign other roles and groups from the admin console.

## 6. Verify the recovery

Check these in order:

- [ ] `https://ycccvrlab.github.io/yccc-academic-affairs/` returns the direct shell.
- [ ] `fragment.html`, `styles.css`, `script.js`, and `admin.html` return `200`.
- [ ] The LibSites public URL renders the header, banner, content, and footer.
- [ ] The browser console has no `Academic Affairs loader failed` message.
- [ ] The public site works signed out and shows the snapshot content.
- [ ] **Actions → Keep Supabase active** succeeds.
- [ ] **Actions → Back up site content** succeeds and updates `backend/firebase/site-content.json` if content changed.
- [ ] `admin.html` loads, sign-in works, and the Users, Groups, Resources, and Site Builder tabs open.
- [ ] A normal faculty account can sign in and sees only the resources allowed by its role and groups (after accounts are recreated following a total project loss).
- [ ] The restricted Assessment link is visible only to the Faculty Chairs group, and the SharePoint folder itself is shared with those users.

Do not treat a successful page load as proof that email delivery works. Verification email still depends on the SMTP configuration.

## 7. Refresh backups after recovery

1. Run **Actions → Back up site content → Run workflow**.
2. Confirm it commits a refreshed `backend/firebase/site-content.json` or reports that the snapshot is already current.
3. Confirm the 30-day `site-content-backup` artifact exists.
4. If Firestore is used, confirm `FIREBASE_SERVICE_ACCOUNT` is set under **Settings → Secrets and variables → Actions** and that the workflow's Firestore step succeeds.
5. Confirm **Keep Supabase active** is enabled. GitHub can disable scheduled workflows after 60 days of repository inactivity; run it manually or re-enable the schedule if that happens.
6. Export the private data that Git intentionally does not hold: group memberships, resource rules, the chair roster, and any unpublished drafts. Keep that export in an access-controlled college location.

## 8. Known limitations

- The public snapshot is a recovery source, not a live database. It can be up to one backup interval stale, and it contains no private data.
- The optional Firestore copy is not read by the current front end as a live failover; it is a restore source for an owner with Firebase access.
- The repository cannot restore Supabase account passwords, sessions, users, private resources, activity history, revisions, or drafts.
- The repository cannot restore LibSites, DNS, SSL, SMTP, SharePoint, or GitHub account access.
- A deleted GitHub repository is not recoverable from this file. Keep a mirror or downloadable archive of the repository outside GitHub.