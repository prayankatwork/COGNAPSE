import { readFileSync, existsSync } from 'fs';
const file = process.argv[2] || '.env.vercel.pulled';
if (!existsSync(file)) {
  console.log('FILE_MISSING');
  process.exit(0);
}
const keys = readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split('=')[0]);
console.log(keys.filter((k) => /FIREBASE|GEMINI|GROQ|RAZORPAY|VITE_/.test(k)).join('\n'));
