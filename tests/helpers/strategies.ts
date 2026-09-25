import { MAX_SEASON_TICKS, RF, RULES } from '../../games/throne-flame/sim/rules';
import { createSeason, step, summarize } from '../../games/throne-flame/sim/season';
import { currentPrice } from '../../games/throne-flame/sim/throne';
import type { Action, SeasonState } from '../../games/throne-flame/sim/types';

export type Strategy = (s: SeasonState) => Action[];
const me = (s: SeasonState) => s.seats[0];
const LOG: Action[] = [{ type: 'addLog' }];
const keepPrice = (s: SeasonState, price: bigint): Action[] =>
  s.throne.price !== price && s.throne.pendingPrice === null ? [{ type: 'setPrice', price }] : [];

/** Scripted players: each follows one simple plan perfectly (with a 0.3 s human reaction), so they probe for dominant plans. */
export const STRATEGIES = {
  idle: () => [],
  spam: s => me(s).cooldown === 0 && me(s).balance >= RF ? LOG : [],
  sniper: s => me(s).cooldown === 0 && s.flame.timer <= 30 && s.flame.lastLog !== 0 && me(s).balance >= RF / 2n ? LOG : [],
  /** The obvious human plan: from 2:00, keep the last log whenever you lose it. */
  lateSpam: s => me(s).cooldown === 0 && s.flame.elapsed >= RULES.flame.woodMinTicks && s.flame.lastLog !== 0 && me(s).balance >= RF / 2n ? LOG : [],
  cheapKing: s => {
    if (s.throne.king === 0) return keepPrice(s, RULES.throne.minPrice);
    const p = currentPrice(s.throne);
    return p <= RF && me(s).balance >= p + RF ? [{ type: 'takeThrone', expectedPrice: p }] : [];
  },
  /** Found in the final review: hold the throne above every bot's buy limit, dump the price in round 3, fight for late logs. */
  lockedKing: s => {
    const late = me(s).cooldown === 0 && s.flame.elapsed >= RULES.flame.woodMinTicks && s.flame.lastLog !== 0 && me(s).balance >= RF / 2n ? LOG : [];
    if (s.throne.king === 0) { const set = keepPrice(s, s.round >= RULES.rounds ? RULES.throne.minPrice : RF * 51n / 10n); return set.length ? set : late; }
    const p = currentPrice(s.throne);
    return p <= 6n * RF && me(s).balance >= p + RF ? [{ type: 'takeThrone', expectedPrice: p }] : late;
  },
  whaleKing: s => {
    if (s.throne.king === 0) return keepPrice(s, 5n * RF);
    const p = currentPrice(s.throne);
    return p <= 6n * RF && me(s).balance >= p + 2n * RF ? [{ type: 'takeThrone', expectedPrice: p }] : [];
  },
} satisfies Record<string, Strategy>;

/** A human needs ~0.3 s to act on what they see, so a scripted decision lands 3 ticks later. */
export function playSeason(seed: number, strategy: Strategy, delay = 3) {
  const s = createSeason(seed), queue: { at: number; actions: Action[] }[] = [];
  for (let i = 0; s.phase !== 'over' && i < MAX_SEASON_TICKS; i++) {
    if (s.phase === 'round' && !queue.length) { const a = strategy(s); if (a.length) queue.push({ at: s.tick + delay, actions: a }); }
    const due = queue.length && queue[0].at <= s.tick + 1 ? queue.shift()!.actions : [];
    step(s, s.phase === 'round' ? due : []);
    if (s.phase !== 'round') queue.length = 0;
  }
  return { summary: summarize(s) };
}
