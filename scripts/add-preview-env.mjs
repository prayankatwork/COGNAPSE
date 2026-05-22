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
  ['GEMINI_API_KEY', env.VITE_GEMINI_API_KEY],
  ['GROQ_API_KEY', env.VITE_GROQ_API_KEY],
  ['FIREBASE_PROJECT_ID', env.VITE_FIREBASE_PROJECT_ID],
];

for (const [name, value] of pairs) {
  if (!value) continue;
  const tmp = resolve(root, '.tmpv');
  writeFileSync(tmp, value);
  try {
    execSync(`npx vercel env add ${name} preview main --force --sensitive --yes < "${tmp}"`, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    console.log(`[ok] ${name}`);
  } catch {
    console.warn(`[skip] ${name}`);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {}
  }
}
