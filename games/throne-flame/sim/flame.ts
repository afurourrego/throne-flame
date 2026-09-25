import { RULES } from './rules';
import { burn, credit, debit } from './ledger';
import { nextInt } from './rng';
import type { Flame, Rng, SeasonState } from './types';

/** The fire burns down: the most time it can hold shrinks by 5 s every 20 s and is 0 at 3:00 (spec §4). */
export function capTicks(elapsed: number): number {
  const f = RULES.flame;
  return Math.max(0, f.capStartTicks - f.capStepTicks * Math.floor(elapsed / f.capEveryTicks));
}

/** A new round's fire; the wood runs out at a hidden moment between 2:00 and 3:00. */
export function newFlame(rng: Rng): Flame {
  const f = RULES.flame;
  return { timer: f.startTicks, elapsed: 0, woodOut: f.woodMinTicks + nextInt(rng, f.woodMaxTicks - f.woodMinTicks + 1), lastLog: null };
}

export function splitLog(price: bigint = RULES.log.price) {
  const burned = price * RULES.log.burnBps / 10_000n, tribute = price * RULES.log.tributeBps / 10_000n;
  return { burned, pot: price - burned - tribute, tribute };
}

export type LogResult = 'ok' | 'cooldown' | 'funds';

/** One log: 40% burned, 50% to the pot, 10% to the king (burned if the throne is empty). */
export function addLog(s: SeasonState, seatId: number, ante = false): LogResult {
  const seat = s.seats[seatId], L = RULES.log;
  if (!ante && seat.cooldown > 0) return 'cooldown';
  if (seat.balance < L.price) return 'funds';
  const part = splitLog();
  debit(seat, L.price);
  burn(s, 'log', part.burned, seat);
  s.pot += part.pot;
  const king = s.throne.king === null ? null : s.seats[s.throne.king];
  if (king) { credit(king, part.tribute); king.tribute += part.tribute; }
  else burn(s, 'log', part.tribute, seat);
  if (!ante) {
    s.flame.timer = Math.min(s.flame.timer + RULES.flame.addTicks, capTicks(s.flame.elapsed));
    s.flame.lastLog = seatId;
    seat.cooldown = L.cooldownTicks;
    s.bots[seatId].lastLogTick = s.tick;
  }
  s.events.push({ type: 'log', seat: seatId, ante });
  return 'ok';
}

/** One tick of fire. True when it goes out: the timer is spent or the wood ran out. */
export function burnDown(f: Flame): boolean {
  f.elapsed++;
  f.timer = Math.min(f.timer - 1, capTicks(f.elapsed));
  return f.timer <= 0 || f.elapsed >= f.woodOut;
}
