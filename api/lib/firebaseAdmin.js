import admin from 'firebase-admin';

let initialized = false;
let initFailed = false;

function normalizePrivateKey(raw) {
  if (!raw) return null;
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

export function getFirebaseAdmin() {
  if (initFailed) return null;

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (!initialized) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }
      initialized = true;
    } catch (err) {
      initFailed = true;
      console.error('[Firebase Admin] init failed:', err?.message || err);
      return null;
    }
  }

  return admin;
}

export function getFirestoreAdmin() {
  const adm = getFirebaseAdmin();
  return adm ? adm.firestore() : null;
}
