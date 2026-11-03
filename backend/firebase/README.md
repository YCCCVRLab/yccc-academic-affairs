# Firebase / Firestore backup

Supabase remains the live authentication and database for the site. This folder contains the Firebase standby path and an earlier full-migration draft. It does **not** duplicate Supabase users or passwords, so a Supabase outage still prevents sign-in, admin changes, private resources, and writes.

The public pages, settings, and published announcements do have a backup: `backend/firebase/site-content.json` is a versioned snapshot. `site-cms.js` reads Supabase first and falls back to that snapshot if the public queries fail. This keeps the published site readable while a paused Supabase project is restored.

The `Back up site content` GitHub Action exports the snapshot daily, retains a 30-day artifact, and copies it to Firestore when the repository secret `FIREBASE_SERVICE_ACCOUNT` is configured. Add that secret under **Settings → Secrets and variables → Actions**; never commit the service-account JSON.

## Refresh the public-content snapshot

From the repository root:

```bash
node scripts/export-site-backup.mjs
```

The script reads only published rows with the public publishable key. It does not export profiles, users, groups, private resources, or activity data.

## Copy the snapshot to Firestore

1. Create the Firebase project and its Cloud Firestore database.
2. Deploy `firestore.rules` from this folder. The `siteBackup` collection is publicly readable and rejects all client writes.
3. Create a service account with permission to write Firestore (for example, Cloud Datastore User). Download its JSON key, but never commit it.
4. Install the isolated backup dependency:

   ```bash
   npm install --prefix backend/firebase
   ```

5. Upload the snapshot:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
   FIREBASE_PROJECT_ID=your-project-id \
   node backend/firebase/upload-backup.mjs
   ```

   You can also put the service-account JSON in `FIREBASE_SERVICE_ACCOUNT`; `FIREBASE_PROJECT_ID` can then be omitted because it is read from the key.

6. The upload writes the entire snapshot as a JSON string in `siteBackup/content`, with `generatedAt`, `pageCount`, `announcementCount`, `source`, and `uploadedAt` metadata. A Firestore document is limited to 1 MiB; the script refuses a snapshot over 950 KB.

To validate the snapshot without credentials:

```bash
node backend/firebase/upload-backup.mjs --dry-run
```

The Firestore copy is a restore source, not a live failover. Re-running the export and upload after CMS changes refreshes it.

## Optional full Firebase migration draft

The rest of this file describes the earlier plan to make Firebase the primary auth and data backend. It is not the current production path.

1. Add a Web app in Project settings and copy its public configuration into a root-level `firebase-config.js` based on `firebase-config.example.js`. Firebase web config is public; never put a service-account key in the website.
2. Enable Email/Password in Authentication.
3. Add `ycccvrlab.github.io` and the approved LibSites domain to Authorized domains.
4. Deploy `firestore.rules`; do not use test mode.
5. Bootstrap the first administrator in the Firebase Console with an `access/{normalized-email}` document:
   `{ role: 'admin', enabled: true, displayName: 'Academic Affairs Admin', updatedAt: timestamp }`.
6. Test unapproved, viewer, editor, and admin accounts in a separate Firebase project before any cutover. Existing Supabase passwords cannot be exported to Firebase; users would need a reset or a parallel sign-in path.

### Firestore data model for the full migration

- `access/{email}`: role (`viewer`, `editor`, `admin`), enabled, displayName, updatedAt.
- `profiles/{uid}`: non-sensitive profile display fields.
- `groups/{groupId}`: name, description.
- `memberships/{uid}`: groupIds array; admin-managed only.
- `resources/{resourceId}`: title, description, url, category, visibility, published, allowedEmails, allowedGroups, timestamps.
- `auditLog/{logId}`: administrative audit events.
- `siteBackup/content`: public-content snapshot used for restore.

### Security notes

- `firestore.rules` is the authority; hiding a link in the browser is not access control.
- Firebase web config is public. Service-account keys and privileged credentials must never be committed or shipped to browsers.
- The portal only gates the SharePoint link. Microsoft 365 permissions still control the underlying documents.
- Test rules in the Firebase Emulator or a separate project before production. Rules are not filters; queries must be shaped to satisfy them.
