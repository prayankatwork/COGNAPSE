import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = resolve(process.argv[2] || resolve(root, '.tmp-service-account.json'));

if (!existsSync(jsonPath)) {
  console.error('Usage: node scripts/push-firebase-admin.mjs [serviceAccount.json]');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(jsonPath, 'utf8'));
const env = {};
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const vars = {
  FIREBASE_PROJECT_ID: sa.project_id,
  FIREBASE_CLIENT_EMAIL: sa.client_email,
  FIREBASE_PRIVATE_KEY: sa.private_key,
  FIREBASE_WEB_API_KEY: env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY,
};

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });

const targets = ['production', 'preview'];

for (const target of targets) {
  for (const [name, value] of Object.entries(vars)) {
    if (!value) continue;
    const tmp = resolve(root, `.tmp-env-${name}`);
    writeFileSync(tmp, value, 'utf8');
    try {
      const cmd =
        target === 'preview'
          ? `npx vercel env add ${name} preview --force --sensitive --yes < "${tmp}"`
          : `npx vercel env add ${name} production --force --sensitive --yes < "${tmp}"`;
      run(cmd);
      console.log(`[ok] ${name} (${target})`);
    } catch (err) {
      console.warn(`[warn] ${name} (${target}) — retry in Vercel dashboard if needed`);
    } finally {
      try {
        unlinkSync(tmp);
      } catch {}
    }
  }
}

if (jsonPath.includes('.tmp-service-account')) {
  try {
    unlinkSync(jsonPath);
  } catch {}
}
console.log('Firebase Admin env synced to Vercel.');
