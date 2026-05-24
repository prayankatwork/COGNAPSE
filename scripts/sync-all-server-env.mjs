/**
 * Syncs all server-side env vars from .env to Vercel production.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = {};
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  const key = t.slice(0, i).trim();
  let value = t.slice(i + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const pick = (...keys) => {
  for (const k of keys) {
    if (env[k]) return env[k];
  }
  return null;
};

const vars = {
  GEMINI_API_KEY: pick('GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'),
  GROQ_API_KEY: pick('GROQ_API_KEY', 'VITE_GROQ_API_KEY'),
  FIREBASE_PROJECT_ID: pick('FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID'),
  FIREBASE_CLIENT_EMAIL: pick('FIREBASE_CLIENT_EMAIL'),
  FIREBASE_PRIVATE_KEY: pick('FIREBASE_PRIVATE_KEY'),
  FIREBASE_WEB_API_KEY: pick('FIREBASE_WEB_API_KEY', 'VITE_FIREBASE_API_KEY'),
  RAZORPAY_KEY_ID: pick('RAZORPAY_KEY_ID'),
  RAZORPAY_KEY_SECRET: pick('RAZORPAY_KEY_SECRET'),
  VITE_RAZORPAY_KEY_ID: pick('VITE_RAZORPAY_KEY_ID', 'RAZORPAY_KEY_ID'),
  OPS_TELEMETRY_API_KEY: pick('OPS_TELEMETRY_API_KEY'),
};

const run = (cmd) =>
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });

for (const target of ['production', 'preview']) {
  for (const [name, value] of Object.entries(vars)) {
    if (!value) {
      console.warn(`[skip] ${name}`);
      continue;
    }
    let out = value;
    if (name === 'FIREBASE_PRIVATE_KEY') {
      out = out.replace(/\\n/g, '\n');
    }
    const tmp = resolve(root, `.tmp-${name}`);
    writeFileSync(tmp, out, 'utf8');
    try {
      run(
        `npx vercel env add ${name} ${target} --force --sensitive --yes < "${tmp}"`
      );
      console.log(`[ok] ${name} (${target})`);
    } catch {
      console.warn(`[warn] ${name} (${target})`);
    } finally {
      try {
        unlinkSync(tmp);
      } catch {}
    }
  }
}

console.log('Server env sync complete. Run: npx vercel deploy --prod --yes');
