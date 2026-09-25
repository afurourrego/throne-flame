import { describe, expect, test } from 'vitest';
import {
  HORIZON, PROP_SPOTS, TORCH_AT, darkAt, embers, fireflies, lightRadius, pathStones, ringStones, skyAt, smokePuffs, stars,
  toneFor, treeline,
} from '../../games/throne-flame/render/backdrop';
import { STUMP } from '../../games/throne-flame/render/art';
import { FIRE_AT, SEAT_AT, THRONE_AT } from '../../games/throne-flame/render/layout';
import { quantizePixel } from '../../games/throne-flame/render/props';

describe('backdrop: a clearing in the woods that gets darker each round', () => {
  test('round 1 is day, round 2 dusk, round 3 night', () => {
    expect([toneFor(1), toneFor(2), toneFor(3)]).toEqual(['day', 'dusk', 'night']);
  });
  test('the treeline sits behind the throne, above the horizon, and is stable per seed', () => {
    const h = treeline(7);
    expect(h).toHaveLength(480);
    expect(Math.max(...h)).toBeLessThanOrEqual(HORIZON - 20);
    expect(Math.min(...h)).toBeGreaterThan(0);
    expect(h.some(v => v < HORIZON - 12)).toBe(true); // real tree tops, not a flat band
    expect(treeline(7)).toEqual(h);
    expect(HORIZON).toBeLessThanOrEqual(THRONE_AT.y - 36); // the throne stands in front of the trees
  });
  test('the sky: clean by day, sparse dither at dusk, near-solid ink at night; stars only in the night sky', () => {
    const cells = (tone: 'day' | 'dusk' | 'night') => { let n = 0; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (skyAt(x, y, tone)) n++; return n; };
    expect(cells('day')).toBe(0);
    expect(cells('dusk')).toBeGreaterThan(0);
    expect(cells('dusk')).toBeLessThan(cells('night'));
    expect(cells('night')).toBeGreaterThanOrEqual(192);
    const st = stars(3);
    expect(st.length).toBeGreaterThanOrEqual(20);
    expect(st.every(p => p.y < HORIZON - 20 && p.x >= 0 && p.x < 480)).toBe(true);
  });
  test('firelight: a bigger flame lights a wider clearing; darkness is a 1-bit dither that grows with the night', () => {
    expect([0, 1, 2, 3].map(lightRadius)).toEqual([...[0, 1, 2, 3].map(lightRadius)].sort((a, b) => a - b));
    expect(lightRadius(3)).toBeGreaterThan(lightRadius(0));
    const count = (tone: 'day' | 'dusk' | 'night') => { let n = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (darkAt(x, y, tone)) n++; return n; };
    expect(count('day')).toBe(0);
    expect(count('dusk')).toBeGreaterThan(0);
    expect(count('night')).toBeGreaterThan(count('dusk'));
    expect(count('night')).toBeLessThanOrEqual(32); // never more than half: Friends and props stay readable
  });
  test('smoke rises from the flame and drifts; embers float up; both are whole pixels', () => {
    const top = FIRE_AT.y - 52;
    for (const t of [0, 400, 1300]) {
      const puffs = smokePuffs(t, 3), sparks = embers(t, 3);
      expect(puffs.length).toBeGreaterThan(0);
      for (const p of [...puffs, ...sparks]) { expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true); expect(p.y).toBeLessThan(FIRE_AT.y); }
      expect(puffs.every(p => p.y <= top + 8 && p.y >= 24)).toBe(true);
    }
    expect(smokePuffs(0, 3)).not.toEqual(smokePuffs(500, 3));
    expect(smokePuffs(0, 0).length).toBeLessThan(smokePuffs(0, 3).length); // embers of a dying fire barely smoke
  });
  test('a stone path runs from the fire to the throne; a stone ring circles the fire', () => {
    const path = pathStones();
    expect(path.length).toBeGreaterThanOrEqual(4);
    expect(path.every(p => p.y > THRONE_AT.y && p.y < FIRE_AT.y - 40 && Math.abs(p.x - FIRE_AT.x) <= 12)).toBe(true);
    const ring = ringStones();
    expect(ring.length).toBeGreaterThanOrEqual(10);
    expect(ring.every(p => Math.abs(p.x - FIRE_AT.x) <= 34 && Math.abs(p.y - FIRE_AT.y) <= 12)).toBe(true);
  });
  test('props and torches stay clear of the seats and the fire', () => {
    const clear = (x: number, y: number, r: number) => SEAT_AT.every(s => Math.hypot(s.x - x, s.y - y) >= r) && Math.hypot(FIRE_AT.x - x, FIRE_AT.y - y) >= r;
    for (const p of PROP_SPOTS) expect(clear(p.x, p.y, 30), `${p.type} at ${p.x},${p.y}`).toBe(true);
    expect(TORCH_AT).toHaveLength(2);
    for (const t of TORCH_AT) expect(clear(t.x, t.y, 40)).toBe(true);
  });
  test('fireflies only at night, blinking', () => {
    expect(fireflies(1000, 'day')).toEqual([]);
    expect(fireflies(1000, 'night').length).toBeGreaterThan(0);
    expect(fireflies(0, 'night')).not.toEqual(fireflies(1600, 'night'));
  });
  test('seats are log stumps; SDK prop art is reduced to ink / signal / paper', () => {
    expect(new Set(STUMP.map(r => r.length)).size).toBe(1);
    expect(STUMP.join('')).toMatch(/^[#py.]+$/);
    expect([quantizePixel(0, 0, 0, 255), quantizePixel(204, 255, 0, 255), quantizePixel(255, 255, 255, 255), quantizePixel(0, 0, 0, 10)]).toEqual(['#', 'y', 'p', '.']);
  });
});
