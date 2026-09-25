import { RULES } from '../sim/rules';
import { snapPrice } from '../sim/throne';

export type KeyIntent = 'log' | 'take' | 'lower' | 'raise' | 'menu' | 'mute';
const MAP: Readonly<Record<string, KeyIntent>> = { Space: 'log', KeyT: 'take', ArrowLeft: 'lower', ArrowRight: 'raise', KeyP: 'menu', Escape: 'menu', KeyM: 'mute' };

/** Space and arrows are always swallowed (so a focused button never fires a second log); only a fresh keydown acts. */
export function keyIntent(e: { code: string; repeat: boolean; type: string }): { intent: KeyIntent | null; prevent: boolean } {
  const prevent = e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight';
  if (e.type !== 'keydown' || e.repeat) return { intent: null, prevent };
  return { intent: MAP[e.code] ?? null, prevent };
}

/** No tick (no tax, no bots, no fire) while the runtime or our menu holds the game, or the tab is hidden. */
export const seasonRunning = (x: { paused: boolean; menu: boolean; hidden: boolean; phase: 'round' | 'break' | 'over' }) =>
  !x.paused && !x.menu && !x.hidden && x.phase !== 'over';

export const nextPrice = (price: bigint, dir: -1 | 1) => snapPrice(price + BigInt(dir) * RULES.throne.step);
