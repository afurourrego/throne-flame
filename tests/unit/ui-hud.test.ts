import { describe, expect, test } from 'vitest';
import { RF, RULES } from '../../games/throne-flame/sim/rules';
import { createSeason, step } from '../../games/throne-flame/sim/season';
import { feedLine, hudData, hudKey, taxPerMin } from '../../games/throne-flame/ui/hudData';

const quiet = () => { const s = createSeason(1); for (const x of s.seats.slice(1)) x.out = true; return s; };
describe('hud', () => {
  test('a fresh season: round 1/3, 0:30 on the fire, the opening logs in the pot and the burn', () => {
    const d = hudData(createSeason(1));
    expect([d.round, d.rounds, d.timer, d.pot, d.burned, d.king, d.hotPotato]).toEqual([1, 3, '0:30', RF * 3n / 10n, RF * 3n / 10n, null, false]);
    expect(d.you).toMatchObject({ canLog: true, canTake: true, takePrice: RF / 2n, isKing: false });
    expect(d.seats.map(x => x.name)).toEqual(['You', 'Miser', 'Whale', 'Sniper', 'Steady', 'Flipper']);
  });
  test('as king you see your price, pending price and tax per minute', () => {
    const s = quiet();
    step(s, [{ type: 'takeThrone', expectedPrice: RF / 2n }]);
    step(s, [{ type: 'setPrice', price: RF }]);
    const d = hudData(s);
    expect(d.king).toEqual({ name: 'You', price: RF * 6n / 10n, taxPerMin: taxPerMin(RF * 6n / 10n) });
    expect(d.you).toMatchObject({ isKing: true, price: RF * 6n / 10n, pendingPrice: RF, canTake: false, takeWhy: 'You are the king' });
    expect(taxPerMin(RF)).toBe(RF * 6n / 100n);
  });
  test('why a button is disabled', () => {
    const s = quiet();
    step(s, [{ type: 'addLog' }]);
    expect(hudData(s).you).toMatchObject({ canLog: false, logWhy: 'Wait a second' });
    s.seats[0].balance = 0n; s.seats[0].cooldown = 0;
    expect(hudData(s).you).toMatchObject({ canLog: false, logWhy: 'Not enough RF', canTake: false, takeWhy: 'Not enough RF' });
  });
  test('hot potato in the last round; a break shows who took the pot', () => {
    const s = quiet();
    s.round = RULES.rounds; expect(hudData(s).hotPotato).toBe(true);
    s.phase = 'break'; s.lastRound = { round: 3, winner: 3, amount: RF * 125n / 100n, burned: RF * 8n / 10n };
    expect(hudData(s).breakLine).toBe('Sniper takes the pot · 1.25 RF · 0.8 RF burned this round');
    s.lastRound = { round: 1, winner: null, amount: 0n, burned: RF };
    expect(hudData(s).breakLine).toBe('Nobody fed the fire: the pot carries over · 1 RF burned this round');
  });
  test('feed lines speak to You and about the others', () => {
    const s = quiet();
    expect(feedLine({ type: 'throneTaken', seat: 2, from: 0, paid: 2n * RF }, s)).toBe('Whale took the throne for 2 RF');
    expect(feedLine({ type: 'throneLost', seat: 2, reason: 'tax' }, s)).toBe('Whale could not pay the tax: the throne is empty');
    expect(feedLine({ type: 'priceChanged', seat: 0 }, s)).toBe('The price changed. Try again.');
    expect(feedLine({ type: 'priceChanged', seat: 4 }, s)).toBeNull();
    expect(feedLine({ type: 'broke', seat: 0 }, s)).toBe('You are out of RF');
    expect(feedLine({ type: 'log', seat: 1, ante: false }, s)).toBeNull();
  });
  test('hudKey is bigint-safe and changes with the numbers', () => {
    const s = quiet(), a = hudKey(hudData(s));
    expect(hudKey(hudData(s))).toBe(a);
    s.seats[0].balance -= 1n;
    expect(hudKey(hudData(s))).not.toBe(a);
  });
});
