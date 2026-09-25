import { loadSvg } from '@rarefriends/friendsdk/assets';
import { renderProp } from '@rarefriends/friendsdk/world';
import type { PropType } from './backdrop';
import { INK, PAPER, SIGNAL } from './palette';

/** SDK prop art is monochrome vector with signal green: reduce each pixel to ink / signal / paper / empty (as in Stay Rare). */
export function quantizePixel(r: number, g: number, b: number, a: number): '#' | 'y' | 'p' | '.' {
  if (a < 128) return '.';
  if (g > 180 && b < 110 && r > 120) return 'y';
  return 0.299 * r + 0.587 * g + 0.114 * b < 200 ? '#' : 'p';
}

/** Low-res pixel height of each prop (the art is cropped to its bounding box first). */
const PROP_SIZE: Readonly<Record<PropType, number>> = { tree: 58, rock: 16, flower: 14, reeds: 22 };

/** Rasterize the official FriendSDK props once: crop, scale to pixel size, requantize to 1-bit. */
export async function rasterizeProps(): Promise<Map<PropType, HTMLCanvasElement>> {
  const out = new Map<PropType, HTMLCanvasElement>();
  await Promise.all((Object.keys(PROP_SIZE) as PropType[]).map(async type => {
    const image = await loadSvg(renderProp(type)), full = document.createElement('canvas');
    full.width = full.height = 240;
    const f = full.getContext('2d', { willReadFrequently: true })!;
    f.drawImage(image, 0, 0, 240, 240);
    const alpha = f.getImageData(0, 0, 240, 240).data;
    let x0 = 240, y0 = 240, x1 = 0, y1 = 0;
    for (let i = 0; i < 240 * 240; i++) if (alpha[i * 4 + 3] > 20) { const x = i % 240, y = (i / 240) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 <= x0 || y1 <= y0) return;
    const h = PROP_SIZE[type], w = Math.max(4, Math.round((x1 - x0 + 1) * h / (y1 - y0 + 1)));
    const small = document.createElement('canvas');
    small.width = w; small.height = h;
    const s = small.getContext('2d', { willReadFrequently: true })!;
    s.imageSmoothingQuality = 'high';
    s.drawImage(full, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, w, h);
    const data = s.getImageData(0, 0, w, h).data, dst = document.createElement('canvas');
    dst.width = w; dst.height = h;
    const d = dst.getContext('2d')!;
    for (let i = 0; i < w * h; i++) {
      const c = quantizePixel(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]);
      if (c === '.') continue;
      d.fillStyle = c === '#' ? INK : c === 'y' ? SIGNAL : PAPER;
      d.fillRect(i % w, (i / w) | 0, 1, 1);
    }
    out.set(type, dst);
  }));
  return out;
}
