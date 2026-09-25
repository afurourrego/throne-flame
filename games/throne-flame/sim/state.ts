import { RULES, SEAT_SETUP } from './rules';
import { createRng } from './rng';
import type { SeasonState } from './types';

/** Six seats with 10 RF each, an empty throne, no round started yet (`createSeason` starts round 1). */
export function emptySeason(seed: number): SeasonState {
  return {
    tick: 0, round: 0, phase: 'round', breakTicks: 0,
    seats: SEAT_SETUP.map((x, id) => ({
      id, name: x.name, personality: x.personality, balance: RULES.startBalance, cooldown: 0,
      burned: 0n, tribute: 0n, reignTicks: 0, potsWon: 0, potWinnings: 0n, out: false, left: false,
    })),
    throne: { king: null, price: RULES.throne.emptyPrice, pendingPrice: null },
    flame: { timer: RULES.flame.startTicks, elapsed: 0, woodOut: RULES.flame.woodMaxTicks, lastLog: null },
    pot: 0n, burned: { log: 0n, tax: 0n, throne: 0n, unclaimed: 0n }, roundBurnStart: 0n, lastRound: null,
    rng: createRng(seed), pending: [], bots: SEAT_SETUP.map(() => ({ nextThink: 0, lastLogTick: -1_000_000, paid: 0n })), events: [],
  };
}
