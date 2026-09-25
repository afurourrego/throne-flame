export const LOW_W = 480, LOW_H = 320;
/**
 * Largest whole multiple of the 480×320 art that fits; up to 2% short still counts (the host frame's 1 px border).
 * Never below 1×: a smaller stage crops the scene's sides instead of resampling the pixels (seats span x 82–398).
 */
export function integerScale(w: number, h: number): number {
  const raw = Math.min(w / LOW_W, h / LOW_H);
  return Math.max(1, Math.floor(raw + 0.02));
}
