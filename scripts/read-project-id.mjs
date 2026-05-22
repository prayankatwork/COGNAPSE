import { readFileSync } from 'fs';
const env = readFileSync('.env', 'utf8');
const line = env.split(/\r?\n/).find((l) => l.startsWith('VITE_FIREBASE_PROJECT_ID='));
if (!line) {
  console.error('MISSING_PROJECT_ID');
  process.exit(1);
}
const value = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
console.log(value);
