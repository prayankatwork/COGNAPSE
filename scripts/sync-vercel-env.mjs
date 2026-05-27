/**
 * Syncs production server env vars to Vercel from local .env
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');

function parseEnv(filePath) {
  const env = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function run(cmd) {
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
}

function addEnv(name, value, envTarget) {
  if (!value) {
    console.warn(`[skip] ${name}: missing value in .env`);
    return;
  }
  const escaped = value.replace(/"/g, '\\"');
  run(
    `npx vercel env add ${name} ${envTarget} --value "${escaped}" --force --sensitive --yes`
  );
  console.log(`[ok] ${name} (${envTarget})`);
}

function removeEnv(name, envTarget) {
  try {
    run(`npx vercel env rm ${name} ${envTarget} --yes`);
    console.log(`[removed] ${name} (${envTarget})`);
  } catch {
    console.log(`[absent] ${name} (${envTarget})`);
  }
}

const local = parseEnv(envPath);
const targets = ['production', 'preview'];

const serverVars = {
  GEMINI_API_KEY: local.GEMINI_API_KEY || local.VITE_GEMINI_API_KEY,
  GROQ_API_KEY: local.GROQ_API_KEY || local.VITE_GROQ_API_KEY,
  GROQ_API_KEY_2: local.GROQ_API_KEY_2,
  FIREBASE_PROJECT_ID: local.FIREBASE_PROJECT_ID || local.VITE_FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: local.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: local.FIREBASE_PRIVATE_KEY,
  RAZORPAY_KEY_ID: local.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: local.RAZORPAY_KEY_SECRET,
  VITE_RAZORPAY_KEY_ID: local.VITE_RAZORPAY_KEY_ID || local.RAZORPAY_KEY_ID,
};

console.log('Syncing server env vars to Vercel...\n');
for (const target of targets) {
  for (const [name, value] of Object.entries(serverVars)) {
    addEnv(name, value, target);
  }
}

console.log('\nRemoving exposed AI keys from Vercel...\n');
for (const target of targets) {
  removeEnv('VITE_GEMINI_API_KEY', target);
  removeEnv('VITE_GROQ_API_KEY', target);
}

console.log('\nSync complete.');
