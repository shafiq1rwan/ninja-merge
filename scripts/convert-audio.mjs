/**
 * Converts public/assets/audio/music/*.ogg to .m4a (AAC) so music also plays on iOS/Safari,
 * which do not decode OGG Vorbis. Requires ffmpeg on PATH or the FFMPEG env var pointing to a binary.
 * The game loads [ogg, m4a] and Phaser picks the first format the browser supports.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'assets', 'audio', 'music');
const ffmpeg = process.env.FFMPEG || 'ffmpeg';

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ogg'));
let ok = 0;
for (const f of files) {
  const input = path.join(dir, f);
  const output = input.replace(/\.ogg$/, '.m4a');
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', input, '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', output], { stdio: 'inherit' });
  if (r.status === 0) ok++; else console.error(`Failed to convert ${f} (is ffmpeg installed?)`);
}
console.log(`Converted ${ok}/${files.length} music tracks to m4a.`);
