import { RF, RULES, sec } from './rules';
import { nextFloat, nextInt } from './rng';
import { currentPrice, snapPrice } from './throne';
import type { Action, Personality, SeasonState, Seat } from './types';

/** How long a bot takes to act on a decision (spec §4: 0.4–1.5 s), so it never beats a human by reflex alone. */
export function reactionTicks(s: SeasonState): number {
  const r = RULES.reaction;
  return r.minTicks + nextInt(s.rng, r.maxTicks - r.minTicks + 1);
}

/** What a bot looks at. Everything here is visible to the player too. */
export type BotView = Readonly<{ s: SeasonState; me: Seat; king: boolean; price: bigint; timer: number; mineLast: boolean; sinceLog: number }>;

export function botView(s: SeasonState, seatId: number): BotView {
  const me = s.seats[seatId];
  return { s, me, king: s.throne.king === seatId, price: currentPrice(s.throne), timer: s.flame.timer, mineLast: s.flame.lastLog === seatId, sinceLog: s.tick - s.bots[seatId].lastLogTick };
}

const LOG: Action = { type: 'addLog' };
const canLog = (v: BotView, reserve: bigint) => v.me.cooldown === 0 && !v.mineLast && v.me.balance >= RULES.log.price + reserve;
const roll = (v: BotView, p: number) => nextFloat(v.s.rng) < p;
const take = (v: BotView): Action => ({ type: 'takeThrone', expectedPrice: v.price });
const lastRound = (v: BotView) => v.s.round >= RULES.rounds; // hot potato: the throne is not refunded
/** From 2:00 the wood may run out any second and the last log then takes the pot, so the bots contest it. */
const late = (v: BotView) => v.s.flame.elapsed >= RULES.flame.woodMinTicks;
const reprice = (v: BotView, target: bigint): Action | null => {
  const t = snapPrice(target);
  return v.s.throne.pendingPrice === null && v.s.throne.price !== t ? { type: 'setPrice', price: t } : null;
};

export const POLICIES: Record<Exclude<Personality, 'player'>, (v: BotView) => Action | null> = {
  miser: v => {
    if (!v.king && !lastRound(v) && v.price <= RF && v.me.balance >= v.price + 4n * RF) return take(v);
    // Early in the last round a cheap throne still pays: two minutes of tribute beat a 0.5–1 RF hot potato.
    if (!v.king && lastRound(v) && v.s.flame.elapsed < sec(60) && v.price <= RF && v.me.balance >= v.price + 3n * RF) return take(v);
    if (v.king) { const r = reprice(v, RF * 7n / 10n); if (r) return r; }
    return canLog(v, 3n * RF) && v.s.pot >= RF && (v.timer <= sec(6) || late(v)) && roll(v, late(v) ? 0.6 : 0.35) ? LOG : null;
  },
  whale: v => {
    // Up to 5 RF always; above that it still contests (30% per look) whenever it can keep a 3 RF reserve — no price is safe.
    if (!v.king && !lastRound(v) && v.me.balance >= v.price + 3n * RF && (v.price <= 5n * RF || roll(v, 0.3))) return take(v);
    if (v.king) { const r = reprice(v, v.me.balance > 4n * RF && !lastRound(v) ? 2n * RF : RULES.throne.minPrice); if (r) return r; }
    return canLog(v, 2n * RF) && v.sinceLog >= sec(8) ? LOG : null;
  },
  sniper: v => canLog(v, RF) && (v.timer <= sec(4) || late(v)) && roll(v, 0.7) ? LOG : null,
  steady: v => canLog(v, 2n * RF) && v.sinceLog >= (late(v) ? sec(2) : sec(4)) ? LOG : null,
  flipper: v => {
    if (!v.king && !lastRound(v) && v.price <= RF * 3n / 2n && v.me.balance >= v.price + 2n * RF) return take(v);
    if (v.king) { const r = reprice(v, lastRound(v) ? RULES.throne.minPrice : v.s.bots[v.me.id].paid * 2n); if (r) return r; }
    return canLog(v, 3n * RF) && v.s.pot >= 2n * RF && v.timer <= sec(3) && roll(v, 0.3) ? LOG : null;
  },
};

/** Each bot thinks every 0.3–0.5 s; its decision is queued and lands after its reaction time. */
export function thinkBots(s: SeasonState): void {
  for (const me of s.seats) {
    if (me.personality === 'player' || me.out) continue;
    const mem = s.bots[me.id];
    if (s.tick < mem.nextThink || s.pending.some(p => p.seat === me.id)) continue;
    mem.nextThink = s.tick + 3 + nextInt(s.rng, 3);
    const action = POLICIES[me.personality](botView(s, me.id));
    if (action) s.pending.push({ seat: me.id, at: s.tick + reactionTicks(s), action });
  }
}
