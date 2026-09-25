import { describe, expect, test } from 'vitest';
import { MAX_SEASON_TICKS, RF, RULES, sec } from '../../games/throne-flame/sim/rules';
import { createSeason, finishSeason, leaveSeason, ranking, step, summarize } from '../../games/throne-flame/sim/season';
import { splitLog } from '../../games/throne-flame/sim/flame';
import { currentPrice } from '../../games/throne-flame/sim/throne';
import { totalRF } from '../../games/throne-flame/sim/ledger';
import type { Action, SeasonState } from '../../games/throne-flame/sim/types';

const json = (s: SeasonState) => JSON.stringify(s, (_, v) => typeof v === 'bigint' ? String(v) : v);
const botsOut = (s: SeasonState) => { for (const x of s.seats.slice(1)) x.out = true; s.pending = []; };
const spam = (s: SeasonState): Action[] => s.seats[0].cooldown === 0 && s.seats[0].balance >= RF ? [{ type: 'addLog' }] : [];

describe('season', () => {
  test('round 1 starts with an opening log from every seat', () => {
    const s = createSeason(1), ante = splitLog();
    expect([s.round, s.phase]).toEqual([1, 'round']);
    expect(s.seats.every(x => x.balance === 10n * RF - RULES.log.price)).toBe(true);
    expect(s.pot).toBe(6n * ante.pot);
    expect(s.burned.log).toBe(6n * (ante.burned + ante.tribute));
    expect(s.flame).toMatchObject({ timer: sec(30), lastLog: null });
    expect(s.events.filter(e => e.type === 'log' && e.ante)).toHaveLength(6);
  });
  test('the invariant holds on every tick of 120 full seasons, and every round ends by 3:00', () => {
    const problems: string[] = [];
    for (let seed = 0; seed < 120; seed++) {
      const s = createSeason(seed);
      let roundTicks = 0, i = 0;
      for (; s.phase !== 'over' && i < MAX_SEASON_TICKS; i++) {
        const was = s.phase;
        step(s, spam(s));
        if (totalRF(s) !== 60n * RF) problems.push(`seed ${seed} tick ${s.tick}: total ${totalRF(s)}`);
        if (s.seats.some(x => x.balance < 0n)) problems.push(`seed ${seed} tick ${s.tick}: negative balance`);
        roundTicks = was === 'round' ? roundTicks + 1 : 0;
        if (roundTicks > sec(180)) problems.push(`seed ${seed}: round ${s.round} longer than 3:00`);
      }
      if (s.phase !== 'over' || s.round !== 3) problems.push(`seed ${seed}: season did not finish`);
    }
    expect(problems.slice(0, 5)).toEqual([]);
  });
  test('the last (non-opening) log takes the pot when the wood runs out', () => {
    const s = createSeason(2); botsOut(s);
    step(s, [{ type: 'addLog' }]);
    s.flame.woodOut = s.flame.elapsed + 1;
    const pot = s.pot, before = s.seats[0].balance;
    step(s);
    expect(s.events).toContainEqual({ type: 'potWon', seat: 0, amount: pot });
    expect(s.seats[0].balance).toBe(before + pot);
    expect([s.phase, s.pot, s.seats[0].potsWon]).toEqual(['break', 0n, 1]);
    expect(s.lastRound).toMatchObject({ round: 1, winner: 0, amount: pot });
  });
  test('spending your last RF on the winning log never leaves you stuck "out" with the pot', () => {
    const s = createSeason(2); botsOut(s);
    s.seats[0].balance = RULES.log.price;
    step(s, [{ type: 'addLog' }]);
    expect(s.seats[0].balance).toBe(0n);
    expect(s.seats[0].out).toBe(false); // still holds the last log
    s.flame.woodOut = s.flame.elapsed + 1; const pot = s.pot;
    step(s);
    expect(s.events).toContainEqual({ type: 'potWon', seat: 0, amount: pot });
    expect(s.seats[0]).toMatchObject({ balance: pot, out: false });
  });
  test('a round with only opening logs carries the pot; in round 3 it burns as unclaimed', () => {
    const s = createSeason(3); botsOut(s);
    s.flame.woodOut = s.flame.elapsed + 1; const pot1 = s.pot;
    step(s);
    expect(s.events).toContainEqual({ type: 'potCarried', amount: pot1 });
    while (s.phase !== 'round') step(s);
    expect(s.round).toBe(2);
    expect(s.pot).toBe(pot1 + splitLog().pot); // only You still antes (bots are out)
    s.round = 3; s.flame.woodOut = s.flame.elapsed + 1; const pot3 = s.pot;
    step(s);
    expect(s.events).toContainEqual({ type: 'potBurned', amount: pot3 });
    expect(s.burned.unclaimed).toBe(pot3);
    expect(s.phase).toBe('over');
    expect(s.events).toContainEqual({ type: 'seasonEnd' });
  });
  test('a price set this tick does not apply to a takeover in the same tick', () => {
    const s = createSeason(4); botsOut(s);
    step(s, [{ type: 'takeThrone', expectedPrice: currentPrice(s.throne) }]);
    expect(s.throne.king).toBe(0);
    const shown = s.throne.price;
    s.seats[2].out = false; s.bots[2].nextThink = Number.MAX_SAFE_INTEGER;
    s.pending.push({ seat: 2, at: s.tick + 1, action: { type: 'takeThrone', expectedPrice: shown } });
    step(s, [{ type: 'setPrice', price: 9n * RF }]);
    expect(s.throne.king).toBe(2);
    expect(s.events).toContainEqual({ type: 'throneTaken', seat: 2, from: 0, paid: shown });
  });
  test('no tax and no actions during the 3 s break', () => {
    const s = createSeason(5); botsOut(s);
    step(s, [{ type: 'takeThrone', expectedPrice: currentPrice(s.throne) }]);
    s.flame.woodOut = s.flame.elapsed + 1; step(s);
    expect(s.phase).toBe('break');
    const balance = s.seats[0].balance;
    for (let i = 0; i < RULES.breakTicks - 1; i++) { step(s, [{ type: 'addLog' }]); expect(s.seats[0].balance).toBe(balance); }
    step(s);
    expect([s.phase, s.round]).toEqual(['round', 2]);
  });
  test('leaving freezes your balance, gives up the throne and still reaches the end', () => {
    const s = createSeason(6);
    step(s, [{ type: 'takeThrone', expectedPrice: currentPrice(s.throne) }]);
    expect(s.throne.king).toBe(0);
    leaveSeason(s);
    expect(s.throne.king).toBeNull();
    const frozen = s.seats[0].balance;
    finishSeason(s);
    expect(s.phase).toBe('over');
    expect(s.seats[0].balance).toBe(frozen);
    expect(summarize(s).you.left).toBe(true);
    expect(totalRF(s)).toBe(60n * RF);
  });
  test('skipping (finishSeason) equals stepping to the end with no player actions', () => {
    const a = createSeason(7), b = createSeason(7);
    for (let i = 0; i < 100; i++) { step(a); step(b); }
    finishSeason(a);
    while (b.phase !== 'over') step(b);
    expect(json(a)).toBe(json(b));
  });
  test('same seed + same actions → same season (determinism)', () => {
    const run = () => { const s = createSeason(99); while (s.phase !== 'over') step(s, spam(s)); return json(s); };
    expect(run()).toBe(run());
  });
  test('ranking: net profit first, then RF burned, then seat order', () => {
    const s = createSeason(8);
    for (const x of s.seats) { x.balance = 10n * RF; x.burned = 0n; }
    s.seats[3].balance = 11n * RF; s.seats[1].burned = 2n * RF; s.seats[5].burned = 2n * RF;
    expect(ranking(s).map(r => r.name)).toEqual(['Sniper', 'Miser', 'Flipper', 'You', 'Whale', 'Steady']);
    expect(summarize(s)).toMatchObject({ place: 4, you: { net: 0n, left: false } });
  });
});
