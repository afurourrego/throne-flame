import { createRng, nextFloat, nextInt } from '../sim/rng';
import { FIRE_AT, THRONE_AT } from './layout';

/** The clearing (pure geometry, low-res px): a forest edge that darkens each round, lit by the fire. 1-bit dithers only. */
export type Tone = 'day' | 'dusk' | 'night';
export type Dot = Readonly<{ x: number; y: number }>;
export type PropType = 'tree' | 'rock' | 'flower' | 'reeds';

export const HORIZON = 64; // where the treeline meets the clearing, just behind the throne
export const toneFor = (round: number): Tone => round <= 1 ? 'day' : round === 2 ? 'dusk' : 'night';

/** Top y of the forest silhouette for each x: a solid band from y 44 plus pine tops reaching up to ~y 22. */
export function treeline(seed: number): number[] {
  const rng = createRng(seed ^ 0x51ee7), tops: { cx: number; h: number; w: number }[] = [];
  for (let x = -10; x < 490; x += 14 + nextInt(rng, 10)) tops.push({ cx: x, h: 8 + nextInt(rng, 16), w: 7 + nextInt(rng, 5) });
  return Array.from({ length: 480 }, (_, x) => {
    let top = HORIZON - 20;
    for (const t of tops) {
      const d = Math.abs(x - t.cx);
      if (d < t.w) top = Math.min(top, HORIZON - 20 - Math.round(t.h * (1 - d / t.w) / 2) * 2); // 2 px steps: pixel pines
    }
    return top;
  });
}

/** Sky cells that are ink: none by day, a sparse dither at dusk, solid at night (the stars are cut out of it). */
export function skyAt(x: number, y: number, tone: Tone): boolean {
  if (tone === 'day') return false;
  if (tone === 'dusk') return (x % 4 === 0 && y % 4 === 0) || ((x + 2) % 4 === 0 && (y + 2) % 4 === 0);
  return true;
}

export function stars(seed: number): Dot[] {
  const rng = createRng(seed ^ 0x57a25);
  return Array.from({ length: 28 }, () => ({ x: nextInt(rng, 480), y: 2 + nextInt(rng, HORIZON - 24) }));
}

/** How far the fire lights the clearing (horizontal radius; the lit area is an ellipse half as tall). */
export const lightRadius = (stage: number) => [70, 105, 140, 170][Math.max(0, Math.min(3, stage))];

/** Ground cells darkened outside the firelight: none by day, 1 in 8 at dusk, 1 in 4 at night. */
export function darkAt(x: number, y: number, tone: Tone): boolean {
  if (tone === 'day') return false;
  if (tone === 'dusk') return (x % 4 === 0 && y % 4 === 0) || ((x + 2) % 4 === 0 && (y + 2) % 4 === 0);
  return x % 2 === 0 && y % 2 === 0;
}

/** Smoke: puffs rise from the flame tip, drift right and fade (fewer and lower when the fire is dying). */
export function smokePuffs(now: number, stage: number): (Dot & { r: number })[] {
  const count = [1, 2, 3, 4][stage] ?? 1, top = FIRE_AT.y - 52, out: (Dot & { r: number })[] = [];
  for (let i = 0; i < count; i++) {
    const phase = ((now / 2600) + i / count) % 1;
    out.push({ x: Math.round(FIRE_AT.x + Math.sin(phase * 5 + i) * 4 + phase * 22), y: Math.round(top + 6 - phase * (30 + stage * 10)), r: phase < 0.6 ? 2 : 1 });
  }
  return out;
}

/** Embers: signal pixels floating up out of the fire. */
export function embers(now: number, stage: number): Dot[] {
  const count = [2, 3, 5, 7][stage] ?? 2, out: Dot[] = [];
  for (let i = 0; i < count; i++) {
    const phase = ((now / 1500) + i * 0.37) % 1;
    out.push({ x: Math.round(FIRE_AT.x + Math.sin(i * 2.1 + phase * 3) * 14), y: Math.round(FIRE_AT.y - 10 - phase * (30 + stage * 10)) });
  }
  return out;
}

/** Flat stones from the fire up to the throne's dais. */
export function pathStones(): Dot[] {
  const out: Dot[] = [];
  for (let y = THRONE_AT.y + 14, i = 0; y < FIRE_AT.y - 46; y += 9, i++) out.push({ x: FIRE_AT.x + (i % 2 ? 5 : -5), y });
  return out;
}

/** The ring of stones that holds the fire. */
export function ringStones(): Dot[] {
  return Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return { x: Math.round(FIRE_AT.x + Math.cos(a) * 30), y: Math.round(FIRE_AT.y + 4 + Math.sin(a) * 7) };
  });
}

/** Official FriendSDK props at the forest edge (bottom-centre anchors), clear of every seat and the fire. */
export const PROP_SPOTS: readonly (Dot & { type: PropType })[] = [
  { type: 'tree', x: 26, y: 150 }, { type: 'tree', x: 60, y: 104 }, { type: 'tree', x: 454, y: 150 }, { type: 'tree', x: 420, y: 104 },
  { type: 'reeds', x: 18, y: 200 }, { type: 'reeds', x: 464, y: 196 },
  { type: 'rock', x: 30, y: 262 }, { type: 'rock', x: 452, y: 262 },
  { type: 'flower', x: 110, y: 262 }, { type: 'flower', x: 372, y: 262 },
];

/** Two torches beside the throne (bottom of the pole). */
export const TORCH_AT: readonly Dot[] = [{ x: 196, y: 104 }, { x: 284, y: 104 }];

/** Night only: signal fireflies blinking at the forest edge. */
export function fireflies(now: number, tone: Tone): Dot[] {
  if (tone !== 'night') return [];
  const rng = createRng(0xf1ef1e), out: Dot[] = [];
  for (let i = 0; i < 9; i++) {
    const x = nextFloat(rng) < 0.5 ? 8 + nextInt(rng, 70) : 402 + nextInt(rng, 70), y = 70 + nextInt(rng, 150), period = 900 + nextInt(rng, 900);
    if ((now + i * 377) % period < period * 0.45) out.push({ x: x + Math.round(Math.sin(now / 700 + i) * 3), y: y + Math.round(Math.cos(now / 900 + i) * 2) });
  }
  return out;
}
