import { describe, expect, test } from 'vitest';
import { RF, RULES, sec } from '../../games/throne-flame/sim/rules';
import { burn, burnedTotal, credit, debit, seasonRF, totalRF } from '../../games/throne-flame/sim/ledger';
import { emptySeason } from '../../games/throne-flame/sim/state';

describe('ledger', () => {
  test('a season holds exactly 60 RF in six 10 RF seats, You first', () => {
    const s = emptySeason(1);
    expect(s.seats.map(x => [x.name, x.personality, x.balance])).toEqual([
      ['You', 'player', 10n * RF], ['Miser', 'miser', 10n * RF], ['Whale', 'whale', 10n * RF],
      ['Sniper', 'sniper', 10n * RF], ['Steady', 'steady', 10n * RF], ['Flipper', 'flipper', 10n * RF],
    ]);
    expect(seasonRF()).toBe(60n * RF);
    expect(totalRF(s)).toBe(60n * RF);
    expect(s.throne).toEqual({ king: null, price: RULES.throne.emptyPrice, pendingPrice: null });
  });
  test('debit refuses to overdraw or take a negative amount', () => {
    const s = emptySeason(1);
    expect(() => debit(s.seats[0], 11n * RF)).toThrow(RangeError);
    expect(() => debit(s.seats[0], -1n)).toThrow(RangeError);
    expect(s.seats[0].balance).toBe(10n * RF);
  });
  test('moving RF to the burn keeps the total and counts it by source and by seat', () => {
    const s = emptySeason(1), you = s.seats[0];
    debit(you, RF); burn(s, 'tax', RF, you);
    debit(s.seats[1], RF / 2n); credit(s.seats[2], RF / 2n);
    expect(s.burned.tax).toBe(RF);
    expect(you.burned).toBe(RF);
    expect(burnedTotal(s)).toBe(RF);
    expect(totalRF(s)).toBe(60n * RF);
  });
  test('sec() converts seconds to 10 Hz ticks', () => {
    expect([sec(1), sec(0.4), sec(180)]).toEqual([10, 4, 1800]);
  });
});
