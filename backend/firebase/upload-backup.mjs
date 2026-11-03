import { readFile } from 'node:fs/promises';
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const BACKUP = new URL('./site-content.json', import.meta.url);

try {
  const backup = JSON.parse(await readFile(BACKUP, 'utf8'));
  if (!Array.isArray(backup.pages) || !backup.pages.length) {
    throw new Error('The snapshot has no pages; refusing to overwrite the Firestore backup.');
  }

  const payload = JSON.stringify(backup);
  if (Buffer.byteLength(payload, 'utf8') > 950_000) {
    throw new Error('The snapshot is too large for a single Firestore document.');
  }

  if (process.argv.includes('--dry-run')) {
    console.log(`Dry run passed: ${backup.pages.length} page(s), ${Buffer.byteLength(payload, 'utf8')} bytes.`);
    process.exit(0);
  }

  const serviceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT;
  let serviceAccount = null;
  if (serviceAccountValue) {
    const text = serviceAccountValue.trim().startsWith('{')
      ? serviceAccountValue
      : await readFile(serviceAccountValue, 'utf8');
    serviceAccount = JSON.parse(text);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount?.project_id;
  if (!projectId) {
    throw new Error('Set FIREBASE_PROJECT_ID or provide a service account containing project_id.');
  }

  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId
  });

  await getFirestore().doc('siteBackup/content').set({
    json: payload,
    generatedAt: backup.generated_at || null,
    pageCount: backup.pages.length,
    announcementCount: Array.isArray(backup.announcements) ? backup.announcements.length : 0,
    source: backup.source || 'supabase',
    uploadedAt: FieldValue.serverTimestamp()
  });

  console.log(`Uploaded ${backup.pages.length} page(s) to Firestore siteBackup/content.`);
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
