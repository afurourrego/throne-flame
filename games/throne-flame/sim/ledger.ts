import { RULES } from './rules';
import type { BurnSource, SeasonState, Seat } from './types';

export function debit(seat: Seat, amount: bigint): void {
  if (amount < 0n || seat.balance < amount) throw new RangeError(`${seat.name} cannot pay ${amount}`);
  seat.balance -= amount;
}
export function credit(seat: Seat, amount: bigint): void {
  if (amount < 0n) throw new RangeError('negative credit');
  seat.balance += amount;
}
/** Burned RF leaves the game for good. `by` is the seat whose action caused it (null: nobody's, e.g. an unclaimed pot). */
export function burn(s: SeasonState, source: BurnSource, amount: bigint, by: Seat | null): void {
  s.burned[source] += amount;
  if (by) by.burned += amount;
}
export const burnedTotal = (s: SeasonState) => s.burned.log + s.burned.tax + s.burned.throne + s.burned.unclaimed;
/** Balances + pot + everything burned: constant for the whole season (spec §4). */
export const totalRF = (s: SeasonState) => s.seats.reduce((n, seat) => n + seat.balance, 0n) + s.pot + burnedTotal(s);
export const seasonRF = () => RULES.startBalance * BigInt(RULES.seats);
