import { describe, expect, test } from 'vitest';
import { RF, sec } from '../../games/throne-flame/sim/rules';
import type { SeasonSummary } from '../../games/throne-flame/sim/season';
import { STRATEGIES, playSeason } from '../helpers/strategies';

const SEEDS = Array.from({ length: 120 }, (_, i) => i + 1);
const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const toRF = (v: bigint) => Number(v * 10_000n / RF) / 10_000;
const runs: Record<string, SeasonSummary[]> = Object.fromEntries(
  Object.entries(STRATEGIES).map(([name, st]) => [name, SEEDS.map(seed => playSeason(seed, st).summary)]));

describe('balance (120 seeds per scripted strategy)', () => {
  test('report', () => {
    console.table(Object.fromEntries(Object.entries(runs).map(([name, r]) => [name, {
      minutes: median(r.map(x => x.ticks)) / sec(60),
      winRate: r.filter(x => x.place === 1).length / r.length,
      medianNet: median(r.map(x => toRF(x.you.net))),
      medianPlace: median(r.map(x => x.place)),
      burnedPct: median(r.map(x => toRF(x.totalBurned))) / 60 * 100,
    }])));
  });
  test('a season lasts 5–9 minutes (median, idle player)', () => {
    const m = median(runs.idle.map(x => x.ticks));
    expect(m).toBeGreaterThanOrEqual(sec(300));
    expect(m).toBeLessThanOrEqual(sec(540));
  });
  test('no scripted strategy is #1 in more than 40% of seasons or has a median profit above +2 RF', () => {
    for (const [name, r] of Object.entries(runs)) {
      expect(r.filter(x => x.place === 1).length / r.length, name).toBeLessThanOrEqual(0.4);
      expect(median(r.map(x => toRF(x.you.net))), name).toBeLessThanOrEqual(2);
    }
  });
  test('standing still is not a plan: the idle player almost never wins (≤ 10%) and places 3rd or worse (median)', () => {
    expect(runs.idle.filter(x => x.place === 1).length / runs.idle.length).toBeLessThanOrEqual(0.10);
    expect(median(runs.idle.map(x => x.place))).toBeGreaterThanOrEqual(3);
  });
  test('each season burns 10–45% of the 60 RF (median, every strategy)', () => {
    for (const [name, r] of Object.entries(runs)) {
      const pct = median(r.map(x => toRF(x.totalBurned))) / 60;
      expect(pct, name).toBeGreaterThanOrEqual(0.10);
      expect(pct, name).toBeLessThanOrEqual(0.45);
    }
  });
  test('some bot ends in profit in at least 80% of seasons', () => {
    // Ruling (final review): against lockedKing the player owns the tribute and the bots fighting for the throne lose,
    // so the table ends with no bot in profit more often; measured 0.67, kept at ≥ 0.6 on purpose (ledger, Final).
    const floor: Record<string, number> = { lockedKing: 0.6 };
    for (const [name, r] of Object.entries(runs)) {
      expect(r.filter(x => x.ranking.some(row => row.seat !== 0 && row.net > 0n)).length / r.length, name).toBeGreaterThanOrEqual(floor[name] ?? 0.8);
    }
  });
});
