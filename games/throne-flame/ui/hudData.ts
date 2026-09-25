import { burnedTotal } from '../sim/ledger';
import { RULES, TICK_HZ } from '../sim/rules';
import { currentPrice } from '../sim/throne';
import type { BurnSource, RejectReason, SeasonState, SimEvent } from '../sim/types';
import { formatTimer, rf } from './format';

export const taxPerMin = (price: bigint) => price / RULES.throne.taxDivisor * BigInt(60 * TICK_HZ);

export type SeatView = Readonly<{ id: number; name: string; balance: bigint; king: boolean; last: boolean; out: boolean; you: boolean }>;
export type HudData = Readonly<{
  round: number; rounds: number; phase: SeasonState['phase']; timer: string; lowTime: boolean; pot: bigint;
  burned: bigint; burnedBy: Readonly<Record<BurnSource, bigint>>;
  king: Readonly<{ name: string; price: bigint; taxPerMin: bigint }> | null;
  seats: readonly SeatView[];
  you: Readonly<{
    balance: bigint; canLog: boolean; logWhy: string; isKing: boolean; takePrice: bigint; canTake: boolean; takeWhy: string;
    price: bigint; pendingPrice: bigint | null; taxPerMin: bigint; tribute: bigint; tributePerMin: bigint; cooldown: number; out: boolean;
  }>;
  hotPotato: boolean; breakLine: string | null;
}>;

function roundLine(s: SeasonState): string | null {
  const r = s.lastRound;
  if (!r) return null;
  const head = r.winner !== null ? `${s.seats[r.winner].name} takes the pot · ${rf(r.amount)}`
    : r.round < RULES.rounds ? 'Nobody fed the fire: the pot carries over' : 'Nobody fed the fire: the pot burned';
  return `${head} · ${rf(r.burned)} burned this round`;
}

export function hudData(s: SeasonState): HudData {
  const me = s.seats[0], t = s.throne, king = t.king === null ? null : s.seats[t.king], isKing = t.king === 0, takePrice = currentPrice(t);
  const logWhy = me.balance < RULES.log.price ? 'Not enough RF' : me.cooldown > 0 ? 'Wait a second' : '';
  const takeWhy = isKing ? 'You are the king' : me.balance < takePrice ? 'Not enough RF' : '';
  return {
    round: s.round, rounds: RULES.rounds, phase: s.phase, timer: formatTimer(s.flame.timer), lowTime: s.flame.timer <= 5 * TICK_HZ, pot: s.pot,
    burned: burnedTotal(s), burnedBy: { ...s.burned },
    king: king ? { name: king.name, price: t.price, taxPerMin: taxPerMin(t.price) } : null,
    seats: s.seats.map(x => ({ id: x.id, name: x.name, balance: x.balance, king: t.king === x.id, last: s.flame.lastLog === x.id, out: x.out || x.left, you: x.id === 0 })),
    you: {
      balance: me.balance, canLog: logWhy === '', logWhy, isKing, takePrice, canTake: takeWhy === '', takeWhy,
      price: t.price, pendingPrice: isKing ? t.pendingPrice : null, taxPerMin: taxPerMin(isKing ? t.pendingPrice ?? t.price : t.price), tribute: me.tribute,
      tributePerMin: me.reignTicks > 0 ? me.tribute * BigInt(60 * TICK_HZ) / BigInt(me.reignTicks) : 0n, cooldown: me.cooldown, out: me.out || me.left,
    },
    hotPotato: s.round === RULES.rounds && s.phase === 'round',
    breakLine: s.phase === 'break' ? roundLine(s) : null,
  };
}

export const hudKey = (d: HudData) => JSON.stringify(d, (_, v) => typeof v === 'bigint' ? v.toString() : v);

const REJECT: Record<RejectReason, string> = {
  cooldown: 'One log per second.', funds: 'Not enough RF.', king: 'You already hold the throne.',
  notKing: 'You are not the king anymore.', invalid: 'Prices go from 0.5 to 50 RF in steps of 0.1.',
};

/** One line for the event feed; null for events that don't need words (logs fly on screen instead). */
export function feedLine(e: SimEvent, s: SeasonState): string | null {
  const name = (id: number) => s.seats[id].name;
  switch (e.type) {
    case 'throneTaken': return `${name(e.seat)} took the throne for ${rf(e.paid)}`;
    case 'throneLost': return e.reason === 'tax' ? `${name(e.seat)} could not pay the tax: the throne is empty` : `${name(e.seat)} left the throne`;
    case 'priceSet': return `${name(e.seat)} set the throne price to ${rf(e.price)}`;
    case 'potWon': return `${name(e.seat)} takes the pot · ${rf(e.amount)}`;
    case 'potCarried': return 'Nobody fed the fire: the pot carries over';
    case 'potBurned': return `Unclaimed pot burned · ${rf(e.amount)}`;
    case 'priceChanged': return e.seat === 0 ? 'The price changed. Try again.' : null;
    case 'rejected': return e.seat === 0 ? REJECT[e.reason] : null;
    case 'broke': return e.seat === 0 ? 'You are out of RF' : `${name(e.seat)} is out of RF`;
    case 'roundStart': return `Round ${e.round}: everyone adds an opening log`;
    default: return null;
  }
}
