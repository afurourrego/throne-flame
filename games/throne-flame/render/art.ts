import { RULES, sec } from '../sim/rules';

export type Px = Readonly<{ x: number; y: number; c: 'ink' | 'paper' | 'signal' }>;
export type ArtName = 'throne' | 'crown' | 'log' | 'coin' | 'spark' | 'stool';
export type SceneItem = Readonly<{ kind: ArtName; x: number; y: number }>;
const CODE: Record<string, Px['c']> = { '#': 'ink', p: 'paper', y: 'signal' };

/** Hand-drawn 1-bit props ('#' ink, 'p' paper, 'y' signal, '.' empty). Drawn at 2× on the 480×320 canvas. */
export const THRONE = [
  '...##############...',
  '...#pppppyyppppp#...',
  '...#p##########p#...',
  '...#p#pppppppp#p#...',
  '...#p#pppppppp#p#...',
  '...#p#pppppppp#p#...',
  '...#p#pppppppp#p#...',
  '...#p#pppppppp#p#...',
  '...#p#pppppppp#p#...',
  '...#p#pppppppp#p#...',
  '.##################.',
  '.#pppppppppppppppp#.',
  '.#p##############p#.',
  '.#p#pppppppppppp#p#.',
  '.##################.',
  '...##..........##...',
  '...##..........##...',
  '...##..........##...',
  '..####........####..',
];
export const CROWN = [
  '#...#...#',
  '##.###.##',
  '#########',
  '#y#y#y#y#',
  '#########',
];
export const LOG = [
  '.#######.',
  '#ppppppp#',
  '#p#p#p#p#',
  '.#######.',
];
export const COIN = ['.##.', '#yy#', '#yy#', '.##.'];
export const SPARK = ['y#', '#y'];
/** A log stump to sit on: the cut top with its growth rings, then a strip of bark. */
export const STUMP = [
  '.########.',
  '#pppppppp#',
  '#pp####pp#',
  '#pp#pp#pp#',
  '#pp####pp#',
  '#pppppppp#',
  '.########.',
  '.#.#..#.#.',
  '.########.',
];
export const STOOL = [
  '##########',
  '.#pppppp#.',
  '.#......#.',
  '.##....##.',
];

export function gridPixels(rows: readonly string[]): Px[] {
  const out: Px[] = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = CODE[ch]; if (c) out.push({ x, y, c }); }));
  return out;
}

/** 0 embers … 3 roaring, from the seconds left on the timer. */
export function flameStage(timer: number): 0 | 1 | 2 | 3 {
  return timer <= sec(5) ? 0 : timer <= sec(15) ? 1 : timer <= sec(30) ? 2 : 3;
}

/** Logs left on the pile, 5 → 1 over the longest possible round (so it never gives away the hidden wood limit). */
export function woodStage(elapsed: number): number {
  return Math.max(1, 5 - Math.floor(elapsed / (RULES.flame.woodMaxTicks / 5)));
}

const HEIGHT = [5, 11, 18, 26], HALF = [4, 6, 8, 10];
const jitter = (a: number, b: number) => (((a + 7) * 73_856_093) ^ ((b + 3) * 19_349_663)) >>> 0;

/** A 1-bit flame: solid ink silhouette, signal core, white-hot paper heart; `frame` 0–3 flickers the edges and sways the tip. */
export function flamePixels(stage: number, frame: number): Px[] {
  const h = HEIGHT[stage], bw = HALF[stage], out: Px[] = [];
  for (let y = 0; y < h; y++) {
    const t = y / h, sway = Math.round(Math.sin((y + frame * 2) / 4) * t * 2.5);
    const body = Math.round(bw * (1 - t ** 1.6)) + (t > 0.4 && t < 0.85 ? jitter(frame, y) % 2 : 0);
    const half = Math.max(0, t >= 0.85 ? Math.min(body, 1) : body); // a narrow tip
    for (let x = -half; x <= half; x++) {
      const a = Math.abs(x), c = a <= half * 0.35 && t < 0.5 ? 'paper' : a <= half * 0.7 && t < 0.75 ? 'signal' : 'ink';
      out.push({ x: x + sway, y: -y, c });
    }
  }
  return out;
}
