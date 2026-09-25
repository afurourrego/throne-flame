import { RULES } from './rules';
import { burn, credit, debit } from './ledger';
import type { SeasonState, Throne } from './types';

const T = RULES.throne;

export const currentPrice = (t: Throne) => t.king === null ? T.emptyPrice : t.price;

/** Nearest 0.1 RF step, clamped to 0.5–50 RF. */
export function snapPrice(p: bigint): bigint {
  const r = (p + T.step / 2n) / T.step * T.step;
  return r < T.minPrice ? T.minPrice : r > T.maxPrice ? T.maxPrice : r;
}
export const validPrice = (p: bigint) => p >= T.minPrice && p <= T.maxPrice && p % T.step === 0n;

export type TakeResult = 'ok' | 'king' | 'priceChanged' | 'funds';

/** Harberger takeover: pay the declared price (empty throne: 0.5 RF, burned). The old king gets 95%; 5% burns. */
export function takeThrone(s: SeasonState, seatId: number, expectedPrice: bigint): TakeResult {
  const t = s.throne, seat = s.seats[seatId];
  if (t.king === seatId) return 'king';
  const price = currentPrice(t);
  if (expectedPrice !== price) { s.events.push({ type: 'priceChanged', seat: seatId }); return 'priceChanged'; }
  if (seat.balance < price) return 'funds';
  debit(seat, price);
  const from = t.king;
  if (from === null) burn(s, 'throne', price, seat);
  else {
    const toSeller = price * T.sellerBps / 10_000n;
    credit(s.seats[from], toSeller);
    burn(s, 'throne', price - toSeller, seat);
  }
  t.king = seatId; t.price = snapPrice(price * T.markupBps / 10_000n); t.pendingPrice = null;
  s.bots[seatId].paid = price;
  s.events.push({ type: 'throneTaken', seat: seatId, from, paid: price });
  return 'ok';
}

export type PriceResult = 'ok' | 'notKing' | 'invalid';

/** The king declares a new price; it counts from the next tick, so it can never race a takeover in the same tick. */
export function setPrice(s: SeasonState, seatId: number, price: bigint): PriceResult {
  if (s.throne.king !== seatId) return 'notKing';
  if (!validPrice(price)) return 'invalid';
  s.throne.pendingPrice = price;
  s.events.push({ type: 'priceSet', seat: seatId, price });
  return 'ok';
}

export function applyPendingPrice(t: Throne): void {
  if (t.pendingPrice !== null) { t.price = t.pendingPrice; t.pendingPrice = null; }
}

export const taxPerTick = (price: bigint) => price / T.taxDivisor;

export function vacate(s: SeasonState, reason: 'tax' | 'left'): void {
  const king = s.throne.king;
  if (king === null) return;
  s.throne.king = null; s.throne.price = T.emptyPrice; s.throne.pendingPrice = null;
  s.events.push({ type: 'throneLost', seat: king, reason });
}

/** Every tick of a round: 0.01% of the declared price (1% every 10 s), burned. Charged per tick so the price can't dodge a payday. */
export function collectTax(s: SeasonState): void {
  const id = s.throne.king;
  if (id === null) return;
  const seat = s.seats[id], tax = taxPerTick(s.throne.price);
  if (seat.balance < tax) { vacate(s, 'tax'); return; }
  debit(seat, tax);
  burn(s, 'tax', tax, seat);
  seat.reignTicks++;
}
