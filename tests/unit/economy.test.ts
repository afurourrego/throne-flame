import { describe, expect, test } from 'vitest';
import { RF, createGamePreview, parseChanceGame } from '@rarefriends/friendsdk/game';
import gameJson from '../../games/throne-flame/game.json';
import { pendingPlay, redeemRekindle, settleTicket, startCheck, startSeason, unclaimedRekindles } from '../../games/throne-flame/economy/ticket';

const definition = parseChanceGame(gameJson);
const SEASON_ROLL = () => 0, REKINDLE_ROLL = () => 9999;
// Same numbers as the SDK host's preview: 20 RF balance, stake = max prize × 10.
const preview = (draw = SEASON_ROLL, rfBalance = 20n * RF) => createGamePreview(definition, { stake: 100n * RF, rfBalance, friendId: 7730n, draw }).client;

describe('season ticket over the SDK preview client', () => {
  test('Start buys and plays one Season for 10 RF', async () => {
    const c = preview();
    expect(await startSeason(c)).toBe(1n);
    const s = await c.read();
    expect([s.rfBalance, s.consumables]).toEqual([10n * RF, 0n]);
    expect(pendingPlay(s)?.id).toBe(1n);
  });
  test('settling: roll < 9900 is a plain season', async () => {
    const c = preview(SEASON_ROLL), id = await startSeason(c);
    expect(await settleTicket(c, id)).toEqual({ kind: 'season', playId: id });
    expect(pendingPlay(await c.read())).toBeUndefined();
  });
  test('roll ≥ 9900 rekindles; redeeming returns the 10 RF to the same balance', async () => {
    const c = preview(REKINDLE_ROLL), id = await startSeason(c);
    expect((await settleTicket(c, id)).kind).toBe('rekindle');
    expect(unclaimedRekindles(await c.read())).toBe(1n);
    await redeemRekindle(c);
    const s = await c.read();
    expect([s.rfBalance, unclaimedRekindles(s)]).toEqual([20n * RF, 0n]);
  });
  test('a Season bought but not played (cancelled confirmation) is reused, not charged again', async () => {
    const c = preview();
    await c.buy(1n);
    await startSeason(c);
    expect((await c.read()).rfBalance).toBe(10n * RF);
  });
  test('an unsettled ticket blocks a new season', async () => {
    const c = preview();
    await startSeason(c);
    expect(startCheck(await c.read(), definition)).toEqual({ ok: false, reason: 'Settle your last season ticket first.' });
    await expect(startSeason(c)).rejects.toThrow('Settle your last season ticket first.');
  });
  test('20 RF covers exactly 2 seasons, then a clear reason', async () => {
    const c = preview();
    for (let i = 0; i < 2; i++) await settleTicket(c, await startSeason(c));
    const check = startCheck(await c.read(), definition);
    expect(check).toEqual({ ok: false, reason: 'Not enough simulated RF. Reload the page to reset the preview.' });
  });
});
