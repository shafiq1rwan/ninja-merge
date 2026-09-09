/**
 * Copies the curated subset of the Ninja Adventure Asset Pack into public/assets/.
 * Usage: node scripts/import-assets.mjs [pathToAssetPack]
 * Default source: "./Ninja Adventure - Asset Pack" next to package.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import entries from './asset-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(process.argv[2] ?? path.join(root, 'Ninja Adventure - Asset Pack'));
const dest = path.join(root, 'public', 'assets');

if (!fs.existsSync(src)) {
  console.error(`Asset pack not found at: ${src}`);
  console.error('Download it from https://pixel-boy.itch.io/ninja-adventure-asset-pack and pass its path.');
  process.exit(1);
}

let copied = 0;
const missing = [];
for (const [from, to, optional] of entries) {
  const s = path.join(src, from);
  const d = path.join(dest, to);
  if (!fs.existsSync(s)) { if (!optional) missing.push(from); continue; }
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.copyFileSync(s, d);
  copied++;
}
console.log(`Copied ${copied} files to ${dest}`);
if (missing.length) {
  console.warn(`Missing ${missing.length} source files:`);
  for (const m of missing) console.warn('  - ' + m);
  process.exitCode = 2;
}
