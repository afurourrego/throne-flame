import type { Rng } from './types';

/** mulberry32 with its state in a plain object so a season stays serializable. Game chance only, never the SDK roll. */
export function createRng(seed: number): Rng { return { s: seed >>> 0 }; }

export function nextU32(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
export function nextFloat(r: Rng): number { return nextU32(r) / 4_294_967_296; }
export function nextInt(r: Rng, n: number): number { return Math.floor(nextFloat(r) * n); }
