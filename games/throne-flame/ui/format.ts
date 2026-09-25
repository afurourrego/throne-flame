import { RF, TICK_HZ } from '../sim/rules';

/** Up to 4 decimals, truncated; thousands separators; the sign is kept. */
export function rf(v: bigint): string {
  const neg = v < 0n, a = neg ? -v : v;
  const whole = a / RF, frac = (a % RF).toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole.toLocaleString('en-US')}${frac ? `.${frac}` : ''} RF`;
}
export const signedRf = (v: bigint) => v > 0n ? `+${rf(v)}` : rf(v);

/** m:ss, rounded up (a fire with 0.1 s left still shows 0:01). */
export function formatTimer(ticks: number): string {
  const s = Math.max(0, Math.ceil(ticks / TICK_HZ));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
