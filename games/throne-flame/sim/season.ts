import { MAX_SEASON_TICKS, RULES } from './rules';
import { thinkBots } from './bots';
import { addLog, burnDown, newFlame } from './flame';
import { burn, burnedTotal, credit } from './ledger';
import { nextInt } from './rng';
import { emptySeason } from './state';
import { applyPendingPrice, collectTax, setPrice, takeThrone, vacate } from './throne';
import type { Action, BurnSource, Rng, SeasonState } from './types';

export function createSeason(seed: number): SeasonState {
  const s = emptySeason(seed);
  startRound(s, 1);
  return s;
}

function startRound(s: SeasonState, round: number): void {
  s.round = round; s.phase = 'round'; s.flame = newFlame(s.rng); s.roundBurnStart = burnedTotal(s);
  s.events.push({ type: 'roundStart', round });
  for (const seat of s.seats) if (!seat.out && !seat.left) addLog(s, seat.id, true); // opening log (spec §4)
  markBroke(s);
}

function endRound(s: SeasonState): void {
  const winner = s.flame.lastLog, amount = s.pot;
  if (winner !== null) {
    const seat = s.seats[winner];
    credit(seat, amount); seat.potsWon++; seat.potWinnings += amount; s.pot = 0n;
    s.events.push({ type: 'potWon', seat: winner, amount });
  } else if (s.round < RULES.rounds) s.events.push({ type: 'potCarried', amount });
  else { burn(s, 'unclaimed', amount, null); s.pot = 0n; s.events.push({ type: 'potBurned', amount }); }
  const burned = burnedTotal(s) - s.roundBurnStart;
  s.lastRound = { round: s.round, winner, amount: winner === null ? 0n : amount, burned };
  s.events.push({ type: 'roundEnd', round: s.round, burned });
  s.pending = [];
  if (s.round === RULES.rounds) { s.phase = 'over'; s.events.push({ type: 'seasonEnd' }); }
  else { s.phase = 'break'; s.breakTicks = RULES.breakTicks; }
}

/** A seat that can't afford a log sits the rest of the season out — unless it is king or holds the last log (the pot may still land). */
function markBroke(s: SeasonState): void {
  for (const seat of s.seats) {
    const holds = s.throne.king === seat.id || (s.phase === 'round' && s.flame.lastLog === seat.id);
    if (!seat.out && seat.balance < RULES.log.price && !holds) { seat.out = true; s.events.push({ type: 'broke', seat: seat.id }); }
  }
}

function apply(s: SeasonState, seat: number, action: Action): void {
  const r = action.type === 'addLog' ? addLog(s, seat)
    : action.type === 'takeThrone' ? takeThrone(s, seat, action.expectedPrice)
    : setPrice(s, seat, action.price);
  if (r !== 'ok' && r !== 'priceChanged') s.events.push({ type: 'rejected', seat, reason: r });
}

function shuffle<T>(xs: T[], rng: Rng): void {
  for (let i = xs.length - 1; i > 0; i--) { const j = nextInt(rng, i + 1); [xs[i], xs[j]] = [xs[j], xs[i]]; }
}

/** One 0.1 s tick. `actions` are the player's (seat 0), queued since the last tick. */
export function step(s: SeasonState, actions: readonly Action[] = []): void {
  s.events = [];
  if (s.phase === 'over') return;
  s.tick++;
  if (s.phase === 'break') { if (--s.breakTicks <= 0) startRound(s, s.round + 1); return; }
  applyPendingPrice(s.throne);
  const me = s.seats[0], queue: { seat: number; action: Action }[] = [];
  if (!me.left && !me.out) for (const action of actions) queue.push({ seat: 0, action });
  s.pending = s.pending.filter(p => { if (p.at <= s.tick) { queue.push(p); return false; } return true; });
  shuffle(queue, s.rng); // same-tick actions: order decided by the seed (spec §4)
  for (const q of queue) apply(s, q.seat, q.action);
  collectTax(s);
  for (const seat of s.seats) if (seat.cooldown > 0) seat.cooldown--;
  markBroke(s);
  if (burnDown(s.flame)) { endRound(s); return; }
  thinkBots(s);
}

export function leaveSeason(s: SeasonState): void {
  const me = s.seats[0];
  if (me.left || s.phase === 'over') return;
  me.left = true;
  if (s.throne.king === 0) vacate(s, 'left');
}

/** Runs the rest of the season at once (Leave season / Skip to results): same simulation, no player actions. */
export function finishSeason(s: SeasonState): void {
  for (let i = 0; s.phase !== 'over' && i < MAX_SEASON_TICKS; i++) step(s);
}

export type Standing = Readonly<{ seat: number; name: string; net: bigint; burned: bigint }>;
export function ranking(s: SeasonState): Standing[] {
  return s.seats.map(x => ({ seat: x.id, name: x.name, net: x.balance - RULES.startBalance, burned: x.burned }))
    .sort((a, b) => a.net !== b.net ? (a.net > b.net ? -1 : 1) : a.burned !== b.burned ? (a.burned > b.burned ? -1 : 1) : a.seat - b.seat);
}

export type SeasonSummary = Readonly<{
  ranking: Standing[]; place: number;
  you: Readonly<{ net: bigint; burned: bigint; reignTicks: number; tribute: bigint; potsWon: number; potWinnings: bigint; left: boolean }>;
  burned: Readonly<Record<BurnSource, bigint>>; totalBurned: bigint; ticks: number;
}>;
export function summarize(s: SeasonState): SeasonSummary {
  const table = ranking(s), me = s.seats[0];
  return {
    ranking: table, place: table.findIndex(r => r.seat === 0) + 1,
    you: { net: me.balance - RULES.startBalance, burned: me.burned, reignTicks: me.reignTicks, tribute: me.tribute, potsWon: me.potsWon, potWinnings: me.potWinnings, left: me.left },
    burned: { ...s.burned }, totalBurned: burnedTotal(s), ticks: s.tick,
  };
}
