import { readFileSync } from 'fs';
import { getFirebaseAdmin } from '../api/lib/firebaseAdmin.js';

const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

process.env.FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL = env.FIREBASE_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY = env.FIREBASE_PRIVATE_KEY;

try {
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.error('FAIL: getFirebaseAdmin returned null');
    process.exit(1);
  }
  console.log('OK: Firebase Admin initialized');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
