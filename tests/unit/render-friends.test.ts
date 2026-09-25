import { describe, expect, test } from 'vitest';
import { ENEMY_FRIENDS } from '../../games/throne-flame/render/enemyFriends';
import { botFrontRows } from '../../games/throne-flame/render/friends';

const COLOSSUS = 6; // the SDK's Colossus has no up/down art; it keeps its side frame
describe('bot Friends face the fire from the front', () => {
  test('every snapshot has 8 idle-front frames (Colossus: none, by design)', () => {
    for (const f of ENEMY_FRIENDS) expect(f.down.length, `#${f.tokenId}`).toBe(f.familyId === COLOSSUS ? 0 : 8);
  });
  test('front rows are 16×16 and animate; Colossus falls back to its side frame', () => {
    for (const f of ENEMY_FRIENDS) {
      const rows = botFrontRows(f, 3);
      expect(rows).toHaveLength(16);
      expect(rows.every(r => r.length === 16)).toBe(true);
    }
    const colossus = ENEMY_FRIENDS.find(f => f.familyId === COLOSSUS)!;
    expect(botFrontRows(colossus, 0)).toEqual(botFrontRows({ ...colossus, down: [] }, 0));
    const other = ENEMY_FRIENDS.find(f => f.familyId !== COLOSSUS)!;
    expect(botFrontRows(other, 0).join('')).toMatch(/#/);
  });
});
