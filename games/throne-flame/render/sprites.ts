import { spriteFrame, type GenerationSprites, type SpriteFacing } from '@rarefriends/friendsdk/sprites';
import { WHITE } from './palette';

export type FramePalette = Readonly<{ mask: string; halo: string | null; eyes: string | null }>;
/** A Friend as on rarefriends.com: plain black silhouette, white eyes. */
export const CANONICAL: FramePalette = { mask: '#111111', halo: null, eyes: WHITE };

/** Small enclosed holes in a 16×16 sprite (≤ 4 px each) are its eyes. */
export function eyeHoles(rows: readonly string[]): Set<number> {
  const h = rows.length, w = rows[0]?.length ?? 0, outside = new Set<number>(), stack: number[] = [];
  const open = (x: number, y: number) => rows[y][x] !== '#';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && open(x, y)) { outside.add(y * w + x); stack.push(y * w + x); }
  const flood = (seen: Set<number>, list: number[]) => {
    while (list.length) {
      const i = list.pop()!, x = i % w, y = Math.floor(i / w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = ny * w + nx;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(j) || !open(nx, ny)) continue;
        seen.add(j); list.push(j);
      }
    }
  };
  flood(outside, stack);
  const eyes = new Set<number>(), done = new Set<number>(outside);
  for (let i = 0; i < w * h; i++) {
    if (done.has(i) || !open(i % w, Math.floor(i / w))) continue;
    const region = new Set<number>([i]); flood(region, [i]);
    region.forEach(j => done.add(j));
    if (region.size <= 4) region.forEach(j => eyes.add(j));
  }
  return eyes;
}

/** 16×16 rows of '#'/'.' → (n+2)² grid: 'm' mask, 'e' eyes, 'h' halo ring, '.' empty. */
export function haloGrid(rows: readonly string[]): string[] {
  const size = rows.length + 2, on = (x: number, y: number) => rows[y - 1]?.[x - 1] === '#';
  const eyes = eyeHoles(rows), w = rows[0]?.length ?? 0;
  return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => {
    if (on(x, y)) return 'm';
    if (eyes.has((y - 1) * w + (x - 1)) && x >= 1 && y >= 1 && x <= w && y <= rows.length) return 'e';
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (on(x + ox, y + oy)) return 'h';
    return '.';
  }).join(''));
}

export function frameCanvas(rows: readonly string[], palette: FramePalette): HTMLCanvasElement {
  const grid = haloGrid(rows), canvas = document.createElement('canvas');
  canvas.width = canvas.height = grid.length;
  const g = canvas.getContext('2d')!;
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    const fill = ch === 'm' ? palette.mask : ch === 'h' ? palette.halo : ch === 'e' ? palette.eyes : null;
    if (!fill) return;
    g.fillStyle = fill; g.fillRect(x, y, 1, 1);
  }));
  return canvas;
}

export type FriendFrames = { get(facing: SpriteFacing, walking: boolean, frame: number): HTMLCanvasElement };
/** Always through the SDK's spriteFrame so families without up/down art use the side fallback. */
export function prepareFriendFrames(sprites: GenerationSprites, palette: FramePalette = CANONICAL): FriendFrames {
  const cache = new Map<string, HTMLCanvasElement>();
  let side: 'left' | 'right' = 'right';
  return {
    get(facing, walking, frame) {
      if (facing === 'left' || facing === 'right') side = facing;
      const resolved = spriteFrame(sprites, facing, walking, frame, side);
      const key = `${resolved.resolvedFacing}-${walking}-${frame}`;
      let canvas = cache.get(key);
      if (!canvas) { canvas = frameCanvas(resolved.frame.rows, palette); cache.set(key, canvas); }
      return canvas;
    },
  };
}
