import { maximumPrize, type ChanceGameDefinition, type GameClient, type GamePlay, type GameSnapshot } from '@rarefriends/friendsdk/game';

export const SEASON_OUTCOME = 1;
export const REKINDLE_OUTCOME = 2;

export type StartCheck = { ok: true } | { ok: false; reason: string };
export type TicketResult = Readonly<{ kind: 'season' | 'rekindle' | 'sealing'; playId: bigint }>;

export function pendingPlay(s: GameSnapshot): GamePlay | undefined { return s.plays.find(p => p.outcomeId === null); }
export function unclaimedRekindles(s: GameSnapshot): bigint { return s.inventory[REKINDLE_OUTCOME - 1] ?? 0n; }

/** `client.canBuy` checks only the game's free stake, so the player's balance is checked here. */
export function startCheck(s: GameSnapshot, d: ChanceGameDefinition): StartCheck {
  if (pendingPlay(s)) return { ok: false, reason: 'Settle your last season ticket first.' };
  if (s.consumables > 0n) return { ok: true };
  if (s.rfBalance < d.price) return { ok: false, reason: 'Not enough simulated RF. Reload the page to reset the preview.' };
  const max = maximumPrize(d);
  if (s.freeStake < max) return { ok: false, reason: 'New seasons are paused until the game has enough free backing.' };
  return { ok: true };
}

/** buy (skipped if a Season is already owned) → play. Each call shows the runtime's own confirmation. */
export async function startSeason(client: GameClient): Promise<bigint> {
  const s = await client.read(), check = startCheck(s, client.definition);
  if (!check.ok) throw new Error(check.reason);
  if (s.consumables === 0n) await client.buy(1n);
  const [play] = await client.play(1n);
  return play.id;
}

/** The 1% rekindle roll happens here, independent of how the season went. */
export async function settleTicket(client: GameClient, playId: bigint): Promise<TicketResult> {
  const settled = await client.settle(playId);
  if (settled.outcomeId === null) return { kind: 'sealing', playId };
  return { kind: settled.outcomeId === REKINDLE_OUTCOME ? 'rekindle' : 'season', playId };
}

/** Never redeem outcome 1: a plain Season is worth 0 and the SDK rejects it. */
export async function redeemRekindle(client: GameClient): Promise<void> { await client.redeem(REKINDLE_OUTCOME, 1n); }
