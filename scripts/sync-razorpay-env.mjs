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

const pairs = [
  ['RAZORPAY_KEY_ID', env.RAZORPAY_KEY_ID],
  ['RAZORPAY_KEY_SECRET', env.RAZORPAY_KEY_SECRET],
  ['VITE_RAZORPAY_KEY_ID', env.VITE_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID],
];

for (const [name, value] of pairs) {
  if (!value) {
    console.warn(`[skip] ${name} missing in .env`);
    continue;
  }
  const tmp = resolve(root, `.tmp-${name}`);
  writeFileSync(tmp, value.trim());
  execSync(`npx vercel env add ${name} production --force --sensitive --yes < "${tmp}"`, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  console.log(`[ok] ${name} -> production`);
  unlinkSync(tmp);
}

console.log('Razorpay production env synced.');
