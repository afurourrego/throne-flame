import { describe, expect, test } from 'vitest';
import { RF, RULES, sec } from '../../games/throne-flame/sim/rules';
import { POLICIES, botView, thinkBots } from '../../games/throne-flame/sim/bots';
import { newFlame } from '../../games/throne-flame/sim/flame';
import { emptySeason } from '../../games/throne-flame/sim/state';
import type { SeasonState } from '../../games/throne-flame/sim/types';

const round = (seed = 1): SeasonState => { const s = emptySeason(seed); s.round = 1; s.flame = newFlame(s.rng); return s; };

describe('bots', () => {
  test('every queued bot action waits a human reaction time of 0.4–1.5 s', () => {
    for (let seed = 0; seed < 50; seed++) {
      const s = round(seed); s.flame.timer = sec(3); s.pot = 3n * RF;
      for (let t = 0; t < 40; t++) {
        s.tick = t;
        const before = s.pending.length;
        thinkBots(s);
        for (const p of s.pending.slice(before)) {
          expect(p.at - s.tick).toBeGreaterThanOrEqual(RULES.reaction.minTicks);
          expect(p.at - s.tick).toBeLessThanOrEqual(RULES.reaction.maxTicks);
        }
      }
    }
  });
  test('a bot with a pending action does not think again; the player and broke seats never think', () => {
    const s = round(3); s.flame.timer = sec(2); s.pot = 3n * RF; s.seats[3].out = true;
    for (let t = 0; t < 30; t++) { s.tick = t; thinkBots(s); }
    const seats = s.pending.map(p => p.seat);
    expect(new Set(seats).size).toBe(seats.length);
    expect(seats).not.toContain(0);
    expect(seats).not.toContain(3);
  });
  test('before 2:00 Sniper only logs in the last 4 seconds, and never while holding the last log', () => {
    const s = round();
    s.flame.timer = sec(10); s.flame.elapsed = sec(60);
    for (let i = 0; i < 200; i++) expect(POLICIES.sniper(botView(s, 3))).toBeNull();
    s.flame.timer = sec(3);
    const acts = Array.from({ length: 200 }, () => POLICIES.sniper(botView(s, 3)));
    expect(acts.some(a => a?.type === 'addLog')).toBe(true);
    s.flame.lastLog = 3;
    expect(POLICIES.sniper(botView(s, 3))).toBeNull();
  });
  test('Steady keeps a 2 RF reserve and logs about every 4 s', () => {
    const s = round(); s.tick = sec(10);
    expect(POLICIES.steady(botView(s, 4))).toEqual({ type: 'addLog' });
    s.bots[4].lastLogTick = sec(8);
    expect(POLICIES.steady(botView(s, 4))).toBeNull();
    s.bots[4].lastLogTick = -1_000; s.seats[4].balance = 2n * RF;
    expect(POLICIES.steady(botView(s, 4))).toBeNull();
  });
  test('early in the last round Miser takes a cheap throne (two minutes of tribute); later nobody buys (hot potato)', () => {
    const early = round(); early.round = RULES.rounds; early.flame.elapsed = sec(30); early.throne = { king: 0, price: RF / 2n, pendingPrice: null };
    expect(POLICIES.miser(botView(early, 1))).toEqual({ type: 'takeThrone', expectedPrice: RF / 2n });
    const s = round(); s.round = RULES.rounds; s.flame.elapsed = sec(90); s.throne = { king: 0, price: RF / 2n, pendingPrice: null };
    const ids = { miser: 1, whale: 2, flipper: 5 } as const;
    for (const [p, id] of Object.entries(ids) as [keyof typeof ids, number][]) {
      for (let i = 0; i < 50; i++) expect(POLICIES[p](botView(s, id))?.type).not.toBe('takeThrone');
    }
  });
  test('from 2:00 (the wood may run out) Sniper, Steady and Miser contest the last log', () => {
    const s = round(); s.flame.timer = sec(20); s.flame.elapsed = sec(125); s.pot = 2n * RF; s.tick = sec(125); s.throne = { king: 2, price: 5n * RF, pendingPrice: null };
    const acts = (id: number, p: 'sniper' | 'steady' | 'miser') => Array.from({ length: 100 }, () => POLICIES[p](botView(s, id))?.type);
    expect(acts(3, 'sniper')).toContain('addLog');
    expect(acts(1, 'miser')).toContain('addLog');
    s.bots[4].lastLogTick = s.tick - sec(2);
    expect(POLICIES.steady(botView(s, 4))).toEqual({ type: 'addLog' }); // every 2 s late, every 4 s before
  });
  test('no price is safe: Whale sometimes contests a throne above 5 RF while it keeps a 3 RF reserve', () => {
    const s = round(); s.throne = { king: 0, price: 51n * RF / 10n, pendingPrice: null };
    const acts = Array.from({ length: 200 }, () => POLICIES.whale(botView(s, 2))?.type);
    expect(acts).toContain('takeThrone');
    s.seats[2].balance = 8n * RF; // 5.1 + 3 > 8: can't keep the reserve
    for (let i = 0; i < 100; i++) expect(POLICIES.whale(botView(s, 2))?.type).not.toBe('takeThrone');
  });
  test('Whale takes a throne up to 5 RF and defends it at 2 RF; Flipper asks double what it paid', () => {
    const s = round(); s.throne = { king: 0, price: 3n * RF, pendingPrice: null };
    expect(POLICIES.whale(botView(s, 2))).toEqual({ type: 'takeThrone', expectedPrice: 3n * RF });
    s.throne = { king: 2, price: 36n * RF / 10n, pendingPrice: null };
    expect(POLICIES.whale(botView(s, 2))).toEqual({ type: 'setPrice', price: 2n * RF });
    s.throne = { king: 5, price: RF * 6n / 10n, pendingPrice: null }; s.bots[5].paid = RF / 2n;
    expect(POLICIES.flipper(botView(s, 5))).toEqual({ type: 'setPrice', price: RF });
  });
});
