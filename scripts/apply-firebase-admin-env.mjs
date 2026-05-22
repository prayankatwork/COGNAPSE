/**
 * Merges Firebase Admin fields from a service-account JSON into .env (no git commit).
 * Usage: node scripts/apply-firebase-admin-env.mjs path/to/serviceAccount.json
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = resolve(process.argv[2] || '');
const envPath = resolve(root, '.env');

if (!jsonPath || !existsSync(jsonPath)) {
  console.error('Usage: node scripts/apply-firebase-admin-env.mjs <serviceAccount.json>');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(jsonPath, 'utf8'));
const privateKeyOneLine = sa.private_key.replace(/\n/g, '\\n');

let env = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const viteApiKey = env.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim();
const upsert = (key, value) => {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  env = re.test(env) ? env.replace(re, line) : `${env.trimEnd()}\n${line}\n`;
};

upsert('FIREBASE_PROJECT_ID', sa.project_id);
upsert('FIREBASE_CLIENT_EMAIL', sa.client_email);
upsert('FIREBASE_PRIVATE_KEY', privateKeyOneLine);
if (viteApiKey) upsert('FIREBASE_WEB_API_KEY', viteApiKey);

writeFileSync(envPath, env.endsWith('\n') ? env : `${env}\n`);
console.log('[ok] Firebase Admin vars written to .env');
