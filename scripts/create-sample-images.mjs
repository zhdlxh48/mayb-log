// Recreate disposable sample assets. Production transforms remain owned by Astro.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const folder = new URL('../src/content/posts/first-note/images/', import.meta.url);
await mkdir(folder, { recursive: true });
for (const [name, width, height] of [
  ['thumbnail.jpg', 2400, 1200], ['landscape.jpg', 2400, 1800],
  ['screen.png', 1600, 1000], ['small.jpg', 1200, 900], ['portrait.jpg', 900, 2400], ['tiny.jpg', 320, 240],
]) {
  const stripe = await sharp({ create: { width: Math.floor(width / 3), height, channels: 3, background: '#446581' } }).png().toBuffer();
  await sharp({ create: { width, height, channels: 3, background: '#e5e9ed' } })
    .composite([{ input: stripe, left: 0, top: 0 }]).toFile(fileURLToPath(new URL(name, folder)));
}
