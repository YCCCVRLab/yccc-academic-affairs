# yccc-academic-affairs
Brightspace-inspired Academic Affairs portal for York County Community College.

## Operations

- **Supabase health check:** `.github/workflows/keep-supabase-awake.yml` queries a public table every six hours to keep the Free project active and alert on failure.
- **Public-content backup:** `node scripts/export-site-backup.mjs` refreshes `backend/firebase/site-content.json`; the site falls back to it when Supabase public reads fail. The `Back up site content` workflow runs daily and uploads to Firestore when `FIREBASE_SERVICE_ACCOUNT` is configured.
- **Firebase/Firestore:** see [backend/firebase/README.md](backend/firebase/README.md). Firebase Auth is not the live sign-in path; Supabase remains authoritative.
- **Faculty chairs and assessment access:** the admin **Chairs** tab syncs the department-chair roster into the Faculty Chairs group. The restricted Assessment Materials resource is visible to that group; SharePoint permissions must also be granted by a SharePoint owner. See [backend/supabase/README.md](backend/supabase/README.md).
- **Faculty resource content:** the CTE/Brightspace modules and the internship, articulation, gender-equity, and prior-learning pages now carry the migrated legacy content and official YCCC/CTE brand visuals.
- **Site Builder history:** `History` records admin snapshots in `aa_site_revisions`; `Undo my last change` restores the state immediately before that admin's latest save. Live editor presence and drafts use a Supabase realtime channel in the authenticated admin console. See [TEMPLATE.md](TEMPLATE.md) for reusing the site.
- **Template deployment:** [TEMPLATE.md](TEMPLATE.md) contains one-click GitHub/Netlify/Vercel deployment links, Supabase setup, content export, and iframe embedding.
