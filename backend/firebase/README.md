# Academic Affairs self-service authentication and admin backend

This is the planned Firebase implementation for the static GitHub Pages site. It replaces the earlier Supabase draft as the chosen approach. The Firebase project is not yet connected to the live website; no project-specific IDs are included here.

## User experience
1. A user selects **Sign in with YCCC** on the site.
2. They create their own account using their @mainecc.edu email and a password.
3. Firebase sends its standard email-verification message. The account must verify the mailbox before the site recognizes it.
4. The user is assigned only the access already configured for their normalized email in Firestore's access collection. An account alone does not grant access to restricted resources.
5. Admins manage users, roles, groups, and resources from an admin-only console.

No Entra registration or manual invitation is required. Email verification proves control of the mailbox, not employment status; admins must maintain the authoritative allowlist and group membership.

## Free-tier notes
GitHub Pages stays the static host. Firebase Authentication email/password and Firestore have no-cost quotas, but usage and quotas can change. Firestore's free quota currently applies to one database per project; check current official limits before launch.

Official references:
- Firebase email/password and verification: https://firebase.google.com/docs/auth/web/password-auth
- Firestore security rules: https://firebase.google.com/docs/firestore/security/get-started
- Firestore pricing/free quota: https://firebase.google.com/docs/firestore/pricing

## Setup
1. Create a Firebase project using an account authorized to administer this service.
2. Add a Web app in Project settings and copy its public web configuration into a new root-level firebase-config.js based on firebase-config.example.js. Firebase web config is public; never put a service-account key or Admin SDK credential in the website.
3. In Authentication, enable Email/Password.
4. In Authentication settings, add ycccvrlab.github.io and any approved LibSites domain to Authorized domains.
5. Create the Cloud Firestore database and deploy firestore.rules from this folder. Do not use test mode.
6. Create the first access/{normalized-email} document for a trusted administrator from the Firebase Console. Document shape: { role: 'admin', enabled: true, displayName: 'Academic Affairs Admin', updatedAt: timestamp }. Use the verified email's lowercase address as the document ID. Do not give admin role based only on client-side input.
7. Configure and test the front-end authentication integration before treating sign-in as live. Verify a user cannot read restricted resources, write their own access document, or become an admin.
8. Add the Assessment SharePoint folder as a resource with visibility restricted, published false until reviewed, allowedEmails empty, and allowedGroups containing Assessment Team. Add intended members in the admin console and also grant them access inside SharePoint itself.

## Firestore data model
- access/{email}: role (viewer, editor, admin), enabled, displayName, updatedAt.
- profiles/{uid}: non-sensitive profile display fields.
- groups/{groupId}: name, description.
- memberships/{uid}: groupIds array; admin-managed only.
- resources/{resourceId}: title, description, url, category, visibility (public, signed_in, restricted), published, allowedEmails, allowedGroups, timestamps.
- auditLog/{logId}: administrative audit events.

## Important security notes
- firestore.rules is the authority for data access; hiding a link in the browser is not access control.
- Keep admin permissions managed in Firestore Console until the authenticated admin console is fully implemented.
- Firebase web config is not a secret. Service account keys and privileged server credentials must never be committed or shipped to browsers.
- The portal only gates the link. SharePoint's own Microsoft 365 permissions still control the underlying Assessment documents.
- This starter ruleset should be tested in the Firebase Emulator or a test project before production. Queries must be shaped to satisfy Firestore rules; rules are not filters.