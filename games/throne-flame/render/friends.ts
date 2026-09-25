import { decodeSpriteBitmap } from '@rarefriends/friendsdk/sprites';
import { createRng, nextInt } from '../sim/rng';
import { ENEMY_FRIENDS, type EnemyFriend } from './enemyFriends';

export const decodeRows = (hex: string) => [...decodeSpriteBitmap(BigInt(`0x${hex}`)).rows];

/** Five different real Friends for the bots, the same for a given season seed (render-only RNG). */
export function botFriendIndices(seed: number): number[] {
  const rng = createRng(seed ^ 0x9e37_79b9), pool = ENEMY_FRIENDS.map((_, i) => i);
  for (let i = 0; i < 5; i++) { const j = i + nextInt(rng, pool.length - i); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 5);
}

/** A bot seen from the front (its idle-down clip, 8 frames); Colossus has no front art, so it keeps its side frame (SDK rule). */
export function botFrontRows(f: EnemyFriend, frame: number): string[] {
  return f.down.length ? decodeRows(f.down[frame % f.down.length]) : decodeRows(f.right[0]);
}
