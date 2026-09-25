import { describe, expect, test } from 'vitest';
import { Fx, LOG_MS } from '../../games/throne-flame/render/fx';
import { FIRE_AT, SEAT_AT } from '../../games/throne-flame/render/layout';

const log = (seat: number) => ({ type: 'log' as const, seat, ante: false });
describe('fx', () => {
  test('a log arcs from the seat into the fire, then a spark, a pot coin and (with a king) a tribute coin', () => {
    const fx = new Fx();
    fx.push([log(0)], 3, 1000, false);
    const early = fx.items(1000 + LOG_MS / 2);
    expect(early.map(i => i.kind)).toEqual(['log']);
    expect(early[0].x).toBeGreaterThan(SEAT_AT[0].x); expect(early[0].x).toBeLessThan(FIRE_AT.x);
    expect(fx.items(1000 + LOG_MS + 1).map(i => i.kind).sort()).toEqual(['coin', 'coin', 'spark']);
    expect(fx.items(1000 + 3000)).toEqual([]);
  });
  test('no king, no tribute coin; reduced motion, no flights at all', () => {
    const fx = new Fx();
    fx.push([log(1)], null, 0, false);
    expect(fx.items(LOG_MS + 1).filter(i => i.kind === 'coin')).toHaveLength(1);
    const still = new Fx(); still.push([log(1)], null, 0, true);
    expect(still.items(10)).toEqual([]);
  });
  test('positions are whole pixels and the list is capped', () => {
    const fx = new Fx();
    for (let i = 0; i < 100; i++) fx.push([log(i % 6)], 2, 0, false);
    const items = fx.items(LOG_MS + 5);
    expect(items.length).toBeLessThanOrEqual(120);
    for (const it of items) { expect(Number.isInteger(it.x)).toBe(true); expect(Number.isInteger(it.y)).toBe(true); }
  });
});
