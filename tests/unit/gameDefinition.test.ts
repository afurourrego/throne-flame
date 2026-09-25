import { describe, expect, test } from 'vitest';
import { RF, expectedReward, maximumPrize, parseChanceGame } from '@rarefriends/friendsdk/game';
import gameJson from '../../games/throne-flame/game.json';

describe('game.json', () => {
  test('is a valid FriendSDK chance game: 10 RF Season, 99% season, 1% rekindle', () => {
    const game = parseChanceGame(gameJson);
    expect(game.consumable).toBe('Season');
    expect(game.price).toBe(10n * RF);
    expect(game.outcomes.map(o => [o.name, o.chanceBps, o.reward])).toEqual([['Season', 9900, 0n], ['Rekindle', 100, 10n * RF]]);
    expect(expectedReward(game)).toBe(RF / 10n);
    expect(maximumPrize(game)).toBe(10n * RF);
  });
});
