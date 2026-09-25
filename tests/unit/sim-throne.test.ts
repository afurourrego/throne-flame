import { describe, expect, test } from 'vitest';
import { RF, RULES } from '../../games/throne-flame/sim/rules';
import { applyPendingPrice, collectTax, currentPrice, setPrice, snapPrice, takeThrone, taxPerTick, validPrice, vacate } from '../../games/throne-flame/sim/throne';
import { totalRF } from '../../games/throne-flame/sim/ledger';
import { emptySeason } from '../../games/throne-flame/sim/state';

const tenth = RF / 10n;

describe('throne', () => {
  test('prices snap to 0.1 RF steps inside 0.5–50 RF', () => {
    expect([snapPrice(RF * 123n / 100n), snapPrice(RF * 125n / 100n), snapPrice(RF / 10n), snapPrice(99n * RF)])
      .toEqual([12n * tenth, 13n * tenth, RF / 2n, 50n * RF]);
    expect([validPrice(RF / 2n), validPrice(RF * 55n / 100n), validPrice(RF * 4n / 10n), validPrice(51n * RF)]).toEqual([true, false, false, false]);
  });
  test('an empty throne costs 0.5 RF, all burned; the new king declares paid × 1.2', () => {
    const s = emptySeason(1);
    expect(currentPrice(s.throne)).toBe(RF / 2n);
    expect(takeThrone(s, 2, RF / 2n)).toBe('ok');
    expect(s.seats[2].balance).toBe(10n * RF - RF / 2n);
    expect(s.burned.throne).toBe(RF / 2n);
    expect(s.throne).toEqual({ king: 2, price: 6n * tenth, pendingPrice: null });
    expect(s.events).toEqual([{ type: 'throneTaken', seat: 2, from: null, paid: RF / 2n }]);
    expect(s.bots[2].paid).toBe(RF / 2n);
  });
  test('taking an occupied throne pays the king 95% and burns 5%', () => {
    const s = emptySeason(1); s.throne = { king: 1, price: 2n * RF, pendingPrice: null };
    expect(takeThrone(s, 0, 2n * RF)).toBe('ok');
    expect(s.seats[0].balance).toBe(8n * RF);
    expect(s.seats[1].balance).toBe(10n * RF + 2n * RF * 95n / 100n);
    expect(s.burned.throne).toBe(2n * RF * 5n / 100n);
    expect(s.throne.king).toBe(0);
    expect(s.throne.price).toBe(24n * tenth);
    expect(totalRF(s)).toBe(60n * RF);
  });
  test('a takeover at a price the buyer did not see is refused with priceChanged', () => {
    const s = emptySeason(1); s.throne = { king: 1, price: 3n * RF, pendingPrice: null };
    expect(takeThrone(s, 0, 2n * RF)).toBe('priceChanged');
    expect(s.events).toEqual([{ type: 'priceChanged', seat: 0 }]);
    expect(s.throne.king).toBe(1);
    expect(s.seats[0].balance).toBe(10n * RF);
  });
  test('the king cannot buy their own throne; nobody can pay more than they have', () => {
    const s = emptySeason(1); s.throne = { king: 1, price: 12n * RF, pendingPrice: null };
    expect(takeThrone(s, 1, 12n * RF)).toBe('king');
    expect(takeThrone(s, 0, 12n * RF)).toBe('funds');
  });
  test('a price change waits for the next tick', () => {
    const s = emptySeason(1); s.throne = { king: 0, price: RF, pendingPrice: null };
    expect(setPrice(s, 0, 3n * RF)).toBe('ok');
    expect(s.throne).toEqual({ king: 0, price: RF, pendingPrice: 3n * RF });
    expect(s.events).toEqual([{ type: 'priceSet', seat: 0, price: 3n * RF }]);
    applyPendingPrice(s.throne);
    expect(s.throne).toEqual({ king: 0, price: 3n * RF, pendingPrice: null });
    expect(setPrice(s, 1, RF)).toBe('notKing');
    expect(setPrice(s, 0, RF * 55n / 100n)).toBe('invalid');
  });
  test('tax is 0.01% of the price every tick (1% every 10 s), burned, and counts the reign', () => {
    const s = emptySeason(1); s.throne = { king: 3, price: 2n * RF, pendingPrice: null };
    expect(taxPerTick(2n * RF)).toBe(2n * RF / 10_000n);
    for (let i = 0; i < 100; i++) collectTax(s);
    expect(s.seats[3].balance).toBe(10n * RF - 2n * RF / 100n); // 1% every 10 s
    expect(s.burned.tax).toBe(2n * RF / 100n);
    expect(s.seats[3].reignTicks).toBe(100);
    expect(totalRF(s)).toBe(60n * RF);
  });
  test('a king who cannot pay a tick of tax loses the throne; it becomes empty at 0.5 RF', () => {
    const s = emptySeason(1); s.throne = { king: 3, price: 50n * RF, pendingPrice: 40n * RF }; s.seats[3].balance = RF / 1000n; // tax/tick = 0.005 RF
    collectTax(s);
    expect(s.throne).toEqual({ king: null, price: RF / 2n, pendingPrice: null });
    expect(s.events).toEqual([{ type: 'throneLost', seat: 3, reason: 'tax' }]);
    expect(s.seats[3].balance).toBe(RF / 1000n);
  });
  test('vacate empties the throne without a refund', () => {
    const s = emptySeason(1); s.throne = { king: 0, price: 5n * RF, pendingPrice: null };
    vacate(s, 'left');
    expect(s.throne).toEqual({ king: null, price: RULES.throne.emptyPrice, pendingPrice: null });
    expect(s.events).toEqual([{ type: 'throneLost', seat: 0, reason: 'left' }]);
    expect(s.seats[0].balance).toBe(10n * RF);
  });
});
