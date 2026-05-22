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
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const run = (cmd) =>
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });

const targets = ['production', 'preview'];
const upsert = (name, value) => {
  if (!value) return;
  const f = resolve(root, `.tmp-${name}`);
  writeFileSync(f, value);
  for (const t of targets) {
    run(`npx vercel env add ${name} ${t} --force --sensitive --yes < "${f}"`);
  }
  unlinkSync(f);
};

const vars = {
  GEMINI_API_KEY: env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY,
  GROQ_API_KEY: env.GROQ_API_KEY || env.VITE_GROQ_API_KEY,
  FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY,
  FIREBASE_WEB_API_KEY: env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY,
  RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET,
  VITE_RAZORPAY_KEY_ID: env.VITE_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID,
};

console.log('1/4 Vercel env upsert...');
for (const [k, v] of Object.entries(vars)) upsert(k, v);

console.log('2/4 Remove exposed AI keys...');
for (const t of targets) {
  for (const k of ['VITE_GEMINI_API_KEY', 'VITE_GROQ_API_KEY']) {
    try {
      run(`npx vercel env rm ${k} ${t} --yes`);
    } catch {}
  }
}

console.log('3/4 Firestore rules...');
try {
  run('npx firebase-tools deploy --only firestore:rules --project cognapse-93cdf --non-interactive');
} catch (e) {
  console.warn('Firestore deploy needs: npx firebase-tools login');
}

console.log('4/4 Vercel production deploy...');
run('npx vercel deploy --prod --yes');
console.log('DONE');
