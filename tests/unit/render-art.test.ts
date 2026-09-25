import { describe, expect, test } from 'vitest';
import { sec } from '../../games/throne-flame/sim/rules';
import { COIN, CROWN, LOG, SPARK, STOOL, THRONE, flamePixels, flameStage, gridPixels, woodStage } from '../../games/throne-flame/render/art';
import { BAR_TOP, FIRE_AT, SEAT_AT, THRONE_AT, seatFacing } from '../../games/throne-flame/render/layout';
import { botFriendIndices } from '../../games/throne-flame/render/friends';
import { ENEMY_FRIENDS } from '../../games/throne-flame/render/enemyFriends';
import { integerScale } from '../../games/throne-flame/render/pixel';

describe('art', () => {
  test('every grid is rectangular and uses only ink / paper / signal / empty', () => {
    for (const g of [THRONE, CROWN, LOG, COIN, SPARK, STOOL]) {
      expect(new Set(g.map(r => r.length)).size).toBe(1);
      expect(g.join('')).toMatch(/^[#py.]+$/);
    }
    expect(gridPixels(['#y', '.p'])).toEqual([{ x: 0, y: 0, c: 'ink' }, { x: 1, y: 0, c: 'signal' }, { x: 1, y: 1, c: 'paper' }]);
  });
  test('the flame grows with the timer and flickers between frames', () => {
    expect([flameStage(sec(3)), flameStage(sec(10)), flameStage(sec(25)), flameStage(sec(40))]).toEqual([0, 1, 2, 3]);
    const rows = (stage: number) => new Set(flamePixels(stage, 0).map(p => p.y)).size;
    expect(rows(0)).toBeLessThan(rows(1)); expect(rows(1)).toBeLessThan(rows(2)); expect(rows(2)).toBeLessThan(rows(3));
    const key = (st: number, f: number) => JSON.stringify(flamePixels(st, f));
    expect(key(3, 0)).not.toBe(key(3, 1));
    for (const p of flamePixels(3, 2)) { expect(p.y).toBeLessThanOrEqual(0); expect(Math.abs(p.x)).toBeLessThanOrEqual(13); }
    expect(flamePixels(3, 0).some(p => p.c === 'signal')).toBe(true);
  });
  test('the wood pile shrinks with time only (it never reveals the hidden limit)', () => {
    expect([woodStage(0), woodStage(sec(40)), woodStage(sec(179))]).toEqual([5, 4, 1]);
  });
});

describe('layout', () => {
  test('six seats, all above the action bar, apart from each other, facing the fire', () => {
    expect(SEAT_AT).toHaveLength(6);
    for (const [i, p] of SEAT_AT.entries()) {
      expect(p.y).toBeLessThanOrEqual(BAR_TOP - 4);
      expect(p.y - 40).toBeGreaterThanOrEqual(28); // head clear of the HUD strip
      expect(p.x).toBeGreaterThan(20); expect(p.x).toBeLessThan(460);
      expect(seatFacing(i)).toBe(p.x < FIRE_AT.x ? 'right' : 'left');
      for (const q of SEAT_AT.slice(i + 1)) expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThanOrEqual(56);
    }
    expect(THRONE_AT.y).toBeLessThan(FIRE_AT.y - 60);
  });
  test('five different real Friends for the bots, stable per seed', () => {
    const a = botFriendIndices(12);
    expect(a).toHaveLength(5);
    expect(new Set(a).size).toBe(5);
    expect(a.every(i => i >= 0 && i < ENEMY_FRIENDS.length)).toBe(true);
    expect(botFriendIndices(12)).toEqual(a);
  });
  test('whole-number scale when it fits (2% border tolerance), never below 1× (the stage crops instead)', () => {
    expect([integerScale(958, 638), integerScale(1440, 960), integerScale(358, 300), integerScale(700, 500)]).toEqual([2, 3, 1, 1]);
    for (const p of SEAT_AT) { expect(p.x - 18).toBeGreaterThanOrEqual(61); expect(p.x + 18).toBeLessThanOrEqual(419); } // fit a 358 px crop
  });
});
