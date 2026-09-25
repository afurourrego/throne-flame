import { mkdir, writeFile } from 'node:fs/promises';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';
import { testGame } from '@rarefriends/friendsdk/testing';
import { startSeason } from './flow.mjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const frames = [];
// Recorded with the SDK's automated test fixture (sample Friend #7730).
await testGame('./games/throne-flame', {
  width: 960, height: 800, timeout: 120_000,
  check: async ({ page, game }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' }); // testGame opens its context with reduced motion on
    await startSeason(page, game);
    const frame = page.locator('.rf-game-frame');
    for (let i = 0; i < 110; i++) {
      if (i % 12 === 5) { const b = game.getByRole('button', { name: 'Add log · 0.1 RF' }); if (await b.isEnabled()) await b.click(); }
      if (i === 30) { const t = game.getByRole('button', { name: /^Take throne · / }); if (await t.isVisible() && await t.isEnabled()) await t.click(); }
      frames.push(await frame.screenshot());
      await page.waitForTimeout(90);
    }
  },
});
const enc = GIFEncoder();
for (const buffer of frames) {
  const png = PNG.sync.read(buffer), w = Math.floor(png.width / 2), h = Math.floor(png.height / 2), rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) rgba[(y * w + x) * 4 + c] = png.data[((y * 2) * png.width + x * 2) * 4 + c];
  const palette = quantize(rgba, 16), index = applyPalette(rgba, palette);
  enc.writeFrame(index, w, h, { palette, delay: 100 });
}
enc.finish();
await mkdir('./artifacts', { recursive: true });
await writeFile('./artifacts/throne-flame.gif', enc.bytes());
console.log('artifacts/throne-flame.gif', frames.length, 'frames');
